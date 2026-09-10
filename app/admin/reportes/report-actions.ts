'use server'

import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'
import { subscriptionStatus, STATUS_LABEL } from '@/lib/billing'

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).maybeSingle()
  if (!profile?.roles?.includes('admin')) return { ok: false as const, error: 'Sin permisos.' }
  return { ok: true as const, supabase }
}

type Row = Record<string, string | number>
type Sheet = { name: string; rows: Row[] }
type PlanRef = { name: string; price: number } | null

export async function buildPeriodReport({
  from,
  to,
}: {
  from: string
  to: string
}): Promise<{ error?: string; sheets?: Sheet[]; generatedAt?: string }> {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const s = auth.supabase

  const fromTs = `${from}T00:00:00`
  const toTs = `${to}T23:59:59`

  const [
    { data: profilesData },
    { data: subsData },
    { data: settings },
    { data: paymentsData },
    { data: dropInData },
    { data: classesData },
    { data: enrollmentsData },
    { data: lateCancels },
    { data: absences },
  ] = await Promise.all([
    s.from('profiles').select('id, full_name, phone, roles'),
    s.from('subscriptions').select('student_id, end_date, comp, comp_reason, plans(name, price)').eq('status', 'active'),
    s.from('studio_settings').select('payment_due_day, payment_reminder_days_before').maybeSingle(),
    s
      .from('payments')
      .select('amount, paid_at, notes, recorded_by, subscriptions(student_id, plans(name))')
      .is('voided_at', null)
      .gte('paid_at', fromTs)
      .lte('paid_at', toTs),
    s
      .from('extra_charges')
      .select('amount, paid_at, description, student_id')
      .eq('paid', true)
      .eq('comp', false)
      .gte('paid_at', fromTs)
      .lte('paid_at', toTs),
    s.from('classes').select('id, day_of_week, start_time, room, capacity, class_types(name)').eq('active', true),
    s.from('enrollments').select('class_id').eq('status', 'active'),
    s
      .from('session_cancellations')
      .select('student_id')
      .eq('within_deadline', false)
      .gte('session_date', from)
      .lte('session_date', to),
    s.from('attendance').select('student_id').eq('status', 'absent').gte('session_date', from).lte('session_date', to),
  ])

  const dueDay = settings?.payment_due_day ?? 10
  const reminderDays = settings?.payment_reminder_days_before ?? 3

  const nameById = new Map<string, string>()
  const phoneById = new Map<string, string>()
  for (const p of profilesData ?? []) {
    nameById.set(p.id as string, (p.full_name as string) ?? '')
    if (p.phone) phoneById.set(p.id as string, p.phone as string)
  }
  const studentIds = new Set(
    (profilesData ?? [])
      .filter((p) => (p.roles as string[] | null)?.includes('student'))
      .map((p) => p.id as string)
  )
  const name = (id: unknown) => (typeof id === 'string' ? nameById.get(id) ?? '' : '')

  // ── Ingresos (una fila por movimiento) ──────────────────────────────────────
  const cuotas = (paymentsData ?? []).map((p) => {
    const sub = p.subscriptions as unknown as { student_id: string; plans: { name: string } | null } | null
    return {
      Fecha: new Date(p.paid_at as string).toLocaleDateString('es-AR'),
      _ts: p.paid_at as string,
      Alumno: name(sub?.student_id),
      Concepto: 'Cuota',
      Plan: sub?.plans?.name ?? '',
      Monto: Number(p.amount),
      Detalle: (p.notes as string | null) ?? '',
      Registró: name(p.recorded_by),
    }
  })
  const sueltas = (dropInData ?? []).map((c) => ({
    Fecha: new Date(c.paid_at as string).toLocaleDateString('es-AR'),
    _ts: c.paid_at as string,
    Alumno: name(c.student_id),
    Concepto: 'Clase suelta',
    Plan: '',
    Monto: Number(c.amount),
    Detalle: (c.description as string) ?? 'Clase suelta',
    Registró: '',
  }))
  const ingresoCuotas = cuotas.reduce((a, r) => a + r.Monto, 0)
  const ingresoSueltas = sueltas.reduce((a, r) => a + r.Monto, 0)
  const ingresosRows: Row[] = [...cuotas, ...sueltas]
    .sort((a, b) => a._ts.localeCompare(b._ts))
    .map(({ _ts, ...rest }) => rest)
  ingresosRows.push({ Fecha: '', Alumno: '', Concepto: '', Plan: 'TOTAL', Monto: ingresoCuotas + ingresoSueltas, Detalle: '', Registró: '' })

  // ── Alumnos (estado a hoy) ─────────────────────────────────────────────────
  const subByStudent = new Map((subsData ?? []).map((x) => [x.student_id as string, x]))
  const alumnosRows: Row[] = []
  const deudoresRows: Row[] = []
  let bonificados = 0
  for (const id of studentIds) {
    const sub = subByStudent.get(id) ?? null
    const status = subscriptionStatus(sub as { end_date: string | null; comp?: boolean | null } | null, reminderDays, dueDay)
    if (status === 'bonificado') bonificados++
    const plan = (sub?.plans as unknown as PlanRef) ?? null
    const row: Row = {
      Alumno: nameById.get(id) ?? '',
      Teléfono: phoneById.get(id) ?? '',
      Plan: plan?.name ?? '',
      Estado: STATUS_LABEL[status],
      'Pagado hasta':
        sub && !sub.comp && sub.end_date && (sub.end_date as string) < '2999-01-01'
          ? new Date(`${sub.end_date}T00:00:00`).toLocaleDateString('es-AR')
          : '',
    }
    alumnosRows.push(row)
    if (status === 'vencido' || status === 'por_vencer') {
      deudoresRows.push({ ...row, 'Precio plan': Number(plan?.price ?? 0) })
    }
  }
  alumnosRows.sort((a, b) => String(a.Alumno).localeCompare(String(b.Alumno)))
  deudoresRows.sort((a, b) => String(a.Alumno).localeCompare(String(b.Alumno)))

  // ── Ocupación ─────────────────────────────────────────────────────────────
  const countByClass = new Map<string, number>()
  for (const e of enrollmentsData ?? []) countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)
  const ocupacionRows: Row[] = (classesData ?? [])
    .map((c) => {
      const enrolled = countByClass.get(c.id) ?? 0
      const cap = c.capacity as number
      return {
        Clase: `${(c.class_types as unknown as { name: string } | null)?.name ?? 'Clase'} · ${DAY_NAMES[c.day_of_week as number]} ${formatTime(c.start_time as string)}`,
        Sala: (c.room as string) ?? '',
        Anotados: enrolled,
        Cupo: cap,
        '%': cap > 0 ? Math.round((enrolled / cap) * 100) : 0,
      }
    })
    .sort((a, b) => (b['%'] as number) - (a['%'] as number))
  const ocupacionProm =
    ocupacionRows.length > 0
      ? Math.round(ocupacionRows.reduce((a, r) => a + (r['%'] as number), 0) / ocupacionRows.length)
      : 0

  // ── Ausentismo del período ────────────────────────────────────────────────
  const absCount = new Map<string, number>()
  for (const r of [...(lateCancels ?? []), ...(absences ?? [])]) {
    absCount.set(r.student_id, (absCount.get(r.student_id) ?? 0) + 1)
  }
  const ausentismoRows: Row[] = Array.from(absCount.entries())
    .map(([id, count]) => ({ Alumno: nameById.get(id) ?? '', 'Avisos tardíos + faltas': count }))
    .sort((a, b) => (b['Avisos tardíos + faltas'] as number) - (a['Avisos tardíos + faltas'] as number))

  // ── Resumen ───────────────────────────────────────────────────────────────
  const resumenRows: Row[] = [
    { Concepto: 'Período', Valor: `${from} a ${to}` },
    { Concepto: 'Ingreso por cuotas', Valor: ingresoCuotas },
    { Concepto: 'Ingreso por clases sueltas', Valor: ingresoSueltas },
    { Concepto: 'Ingreso total', Valor: ingresoCuotas + ingresoSueltas },
    { Concepto: 'Cantidad de pagos de cuota', Valor: cuotas.length },
    { Concepto: 'Cantidad de clases sueltas cobradas', Valor: sueltas.length },
    { Concepto: 'Alumnos activos', Valor: studentIds.size },
    { Concepto: 'Deudores (a hoy)', Valor: deudoresRows.length },
    { Concepto: 'Bonificados', Valor: bonificados },
    { Concepto: 'Ocupación promedio', Valor: `${ocupacionProm}%` },
  ]

  return {
    generatedAt: new Date().toISOString(),
    sheets: [
      { name: 'Resumen', rows: resumenRows },
      { name: 'Ingresos', rows: ingresosRows },
      { name: 'Alumnos', rows: alumnosRows },
      { name: 'Deudores', rows: deudoresRows },
      { name: 'Ocupacion', rows: ocupacionRows },
      { name: 'Ausentismo', rows: ausentismoRows },
    ],
  }
}
