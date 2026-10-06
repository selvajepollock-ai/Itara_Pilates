import Link from 'next/link'
import { Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatARS } from '@/lib/currency'
import { subscriptionDisplayStatus, type PaymentStatus } from '@/lib/billing'
import { collectionSummary } from '@/lib/payments'
import { artMonthStart } from '@/lib/dates'
import { groupPurchases, type ChargeRow } from '@/lib/purchases'
import { loadQuickPaymentStudents } from '@/lib/quick-payment-students'
import { loadStudentRows } from '@/lib/student-rows'
import { StatCard } from '@/app/components/stat-card'
import { SectionCard } from '@/app/components/section-card'
import { ProgressBar } from '@/app/components/progress-bar'
import { STATUS_VIEW } from '@/app/components/status-dot'
import { ESTADO_TO_PARAM } from '../alumnos/types'
import { todayART } from '../horarios/slots'
import { MonthPicker } from './month-picker'
import { monthLabel } from './month-label'
import { Private } from './privacy'
import { OverdueList, PendingChargesList, PlanIncome, TrendChart } from './resumen-parts'

type PlanRef = { name: string; price: number } | null

const ART = 'America/Argentina/Buenos_Aires'
const dayART = (ts: string) => new Intl.DateTimeFormat('en-CA', { timeZone: ART }).format(new Date(ts))

const STATUS_ORDER: PaymentStatus[] = ['al_dia', 'por_vencer', 'vencido', 'sin_plan', 'sueltas', 'bonificado']
const BAR_COLOR: Record<PaymentStatus, string> = {
  al_dia: 'bg-state-ok',
  por_vencer: 'bg-state-soon',
  vencido: 'bg-state-due',
  sin_plan: 'bg-state-none',
  bonificado: 'bg-state-free',
  sueltas: 'bg-state-soon',
}
const PREVIEW_LIMIT = 6

export default async function PagosResumenPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month } = await searchParams
  const today = todayART()
  const currentMonth = today.slice(0, 7)
  const label = /^\d{4}-\d{2}$/.test(month ?? '') ? (month as string) : currentMonth
  const [year, mon] = label.split('-').map(Number)
  const start = new Date(artMonthStart(year, mon))
  const end = new Date(artMonthStart(year, mon + 1))
  // Gráfico: los 6 meses que terminan en el mes elegido.
  const sixMonthsAgo = new Date(artMonthStart(year, mon - 5))

  const supabase = await createClient()

  const [
    { data: studentsData },
    { data: subsData },
    { data: settings },
    { data: monthPayments },
    { data: trendPayments },
    { data: pendingData },
    quickStudents,
    { rows: studentRows },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name').contains('roles', ['student']),
    supabase
      .from('subscriptions')
      .select('id, student_id, end_date, comp, plans(name, price)')
      .eq('status', 'active'),
    supabase.from('studio_settings').select('payment_due_day, payment_reminder_days_before').single(),
    supabase
      .from('payments')
      .select('amount, paid_at, subscriptions(plans(name))')
      .is('voided_at', null)
      .gte('paid_at', start.toISOString())
      .lt('paid_at', end.toISOString()),
    supabase
      .from('payments')
      .select('amount, paid_at')
      .is('voided_at', null)
      .gte('paid_at', sixMonthsAgo.toISOString())
      .lt('paid_at', end.toISOString()),
    // Clases sueltas todavía sin cobrar (solo lectura): no son pagos, por eso no están en el Registro.
    supabase
      .from('extra_charges')
      .select('*, profiles(full_name)')
      .eq('paid', false)
      .eq('comp', false)
      .order('created_at', { ascending: false }),
    loadQuickPaymentStudents(supabase),
    loadStudentRows(supabase),
  ])

  const dueDay = settings?.payment_due_day ?? 10
  const reminderDays = settings?.payment_reminder_days_before ?? 3
  const subs = subsData ?? []
  const students = studentsData ?? []
  const nameById = new Map(students.map((s) => [s.id, s.full_name]))
  const rowById = new Map(studentRows.map((r) => [r.id, r]))

  // Esperado vs cobrado — los bonificados no se esperan cobrar.
  const expected = subs.reduce((sum, s) => sum + (s.comp ? 0 : Number((s.plans as unknown as PlanRef)?.price ?? 0)), 0)
  const payments = monthPayments ?? []
  const collected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const summary = collectionSummary(expected, collected)

  const paymentsToday = payments.filter((p) => dayART(p.paid_at as string) === today)
  const collectedToday = paymentsToday.reduce((s, p) => s + Number(p.amount), 0)

  // Estados de cuota
  const counts: Record<PaymentStatus, number> = { al_dia: 0, por_vencer: 0, vencido: 0, sin_plan: 0, bonificado: 0, sueltas: 0 }
  const overdue: { studentId: string; endDate: string | null; planName: string | null; amount: number }[] = []
  const studentsWithSub = new Set<string>()
  for (const s of subs) {
    studentsWithSub.add(s.student_id)
    const status = subscriptionDisplayStatus(s, reminderDays)
    counts[status] += 1
    if (status === 'vencido') {
      const plan = s.plans as unknown as PlanRef
      overdue.push({ studentId: s.student_id, endDate: s.end_date, planName: plan?.name ?? null, amount: Number(plan?.price ?? 0) })
    }
  }
  counts.sin_plan = students.filter((s) => !studentsWithSub.has(s.id)).length
  // Quienes no tienen plan pero compraron clases sueltas se cuentan aparte (no como "sin plan").
  counts.sueltas = studentRows.filter((r) => r.status === 'sueltas').length
  counts.sin_plan = Math.max(counts.sin_plan - counts.sueltas, 0)
  overdue.sort((a, b) => (a.endDate ?? '').localeCompare(b.endDate ?? ''))
  const totalStudents = STATUS_ORDER.reduce((n, k) => n + counts[k], 0)

  const overdueItems = overdue.slice(0, PREVIEW_LIMIT).map((d) => ({
    studentId: d.studentId,
    name: nameById.get(d.studentId) ?? 'Alumno',
    planName: d.planName,
    amount: d.amount,
    phone: rowById.get(d.studentId)?.phone ?? null,
    lastPaymentAt: rowById.get(d.studentId)?.lastPaymentAt ?? null,
  }))

  // Ingresos por plan
  const incomeByPlan = new Map<string, number>()
  for (const p of payments) {
    const planName = (p.subscriptions as unknown as { plans: { name: string } | null } | null)?.plans?.name ?? 'Sin plan'
    incomeByPlan.set(planName, (incomeByPlan.get(planName) ?? 0) + Number(p.amount))
  }
  const planIncome = [...incomeByPlan.entries()].sort((a, b) => b[1] - a[1])

  // Tendencia: 6 meses terminando en el mes elegido
  const trendMap = new Map<string, number>()
  for (let i = 0; i < 6; i++) {
    const d = new Date(year, mon - 6 + i, 1)
    trendMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0)
  }
  for (const p of trendPayments ?? []) {
    const key = dayART(p.paid_at as string).slice(0, 7)
    if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + Number(p.amount))
  }
  const trend = [...trendMap.entries()]

  // Clases sueltas por cobrar: una fila por compra (varias clases se cobran juntas).
  const nameOfStudent = new Map((pendingData ?? []).map((c) => [c.student_id as string, (c.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Alumno']))
  const pending = groupPurchases(pendingData as unknown as ChargeRow[]).map((p) => ({
    key: p.key,
    ids: p.ids,
    name: nameOfStudent.get(p.studentId) ?? 'Alumno',
    description: p.count === 1 ? (p.rows[0].description ?? 'Clase suelta') : `${p.count} clases sueltas`,
    amount: p.total,
    count: p.count,
  }))

  // Recargo del 10%: solo texto derivado de la fecha de hoy (no calcula montos).
  const [, todayMonth, todayDay] = today.split('-').map(Number)
  const surchargeStarts = `${dueDay + 1}/${todayMonth}`
  const beforeSurcharge = todayDay <= dueDay
  const overdueFrom = `1/${todayMonth}`

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl italic text-ink">{monthLabel(label)}</h2>
        <MonthPicker param="month" value={label} currentMonth={currentMonth} />
      </div>

      {/* Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cobrado en el mes"
          value={<Private mask="$ ••••••">{formatARS(summary.collected)}</Private>}
          href={`/admin/pagos/registro?mes=${label}`}
          hint={
            <>
              {summary.rate}% de <Private mask="$ ••••••">{formatARS(summary.expected)}</Private> esperado · {payments.length}{' '}
              {payments.length === 1 ? 'pago' : 'pagos'}
            </>
          }
        >
          <ProgressBar value={summary.rate} label="Porcentaje de cobranza" tone={summary.rate >= 80 ? 'primary' : 'danger'} />
        </StatCard>

        <StatCard
          label={
            <span className="inline-flex items-center gap-1.5">
              Falta cobrar
              <span
                title="Estimado: suma el precio de lista de los planes activos, sin contar recargos ni clases sueltas."
                aria-label="Estimado: suma el precio de lista de los planes activos, sin contar recargos ni clases sueltas."
                className="inline-flex"
              >
                <Info size={13} aria-hidden />
              </span>
            </span>
          }
          value={<Private mask="$ ••••••">{formatARS(summary.gap)}</Private>}
          href="/admin/alumnos?estado=vencido"
          hint="Estimado según planes activos"
        />

        <StatCard
          label="Cobrado hoy"
          value={<Private mask="$ ••••••">{formatARS(label === currentMonth ? collectedToday : 0)}</Private>}
          href={`/admin/pagos/registro?mes=${currentMonth}&dia=${today}`}
          hint={
            <>
              {label === currentMonth ? paymentsToday.length : 0} {paymentsToday.length === 1 && label === currentMonth ? 'pago' : 'pagos'} ·{' '}
              <span className="font-medium text-moss">Ver registro →</span>
            </>
          }
        />

        <StatCard
          label="Recargo del 10%"
          value={beforeSurcharge ? surchargeStarts : 'Con recargo'}
          href="/admin/alumnos?estado=vencido"
          tone={beforeSurcharge ? 'default' : 'danger'}
          hint={
            beforeSurcharge
              ? `Faltan ${dueDay + 1 - todayDay} ${dueDay + 1 - todayDay === 1 ? 'día' : 'días'} · ${counts.vencido} vencidas`
              : `${counts.vencido} ${counts.vencido === 1 ? 'cuota con recargo' : 'cuotas con recargo'}`
          }
        />
      </div>

      {/* Estado de las cuotas */}
      <SectionCard title="Estado de las cuotas" count={totalStudents}>
        {totalStudents > 0 ? (
          <div className="mt-4 flex h-3.5 gap-0.5 overflow-hidden rounded-full" role="list" aria-label="Estado de las cuotas">
            {STATUS_ORDER.filter((k) => counts[k] > 0).map((k) => (
              <Link
                key={k}
                role="listitem"
                href={`/admin/alumnos?estado=${ESTADO_TO_PARAM[k]}`}
                aria-label={`${STATUS_VIEW[k].label}: ${counts[k]}`}
                title={`${STATUS_VIEW[k].label}: ${counts[k]}`}
                className={`${BAR_COLOR[k]} min-w-[6px]`}
                style={{ flexGrow: counts[k], flexBasis: 0 }}
              />
            ))}
          </div>
        ) : null}
        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          {STATUS_ORDER.map((k) => (
            <li key={k}>
              <Link
                href={`/admin/alumnos?estado=${ESTADO_TO_PARAM[k]}`}
                className="inline-flex min-h-[32px] items-center gap-2 text-sm text-ink hover:text-moss"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${BAR_COLOR[k]}`} aria-hidden />
                {k === 'vencido' ? 'Vencidos' : k === 'bonificado' ? 'Bonificados' : STATUS_VIEW[k].label}
                <span className="font-semibold tabular-nums">{counts[k]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
        {/* Columna izquierda: vencidas y clases sueltas por cobrar */}
        <div className="space-y-6">
          <SectionCard title="Vencidas" count={overdue.length}>
            <p className="mt-1 text-[13px] text-muted">
              Vencieron el {overdueFrom} ·{' '}
              {beforeSurcharge ? `sin recargo hasta el ${dueDay}/${todayMonth}` : 'con recargo del 10%'}
            </p>
            {overdue.length === 0 ? (
              <p className="mt-4 text-sm text-muted">Nadie con la cuota vencida.</p>
            ) : (
              <div className="mt-3">
                <OverdueList items={overdueItems} students={quickStudents} />
                {overdue.length > PREVIEW_LIMIT && (
                  <Link
                    href="/admin/alumnos?estado=vencido"
                    className="mt-3 inline-block text-[13px] font-medium text-moss hover:text-moss-dark"
                  >
                    Ver los {overdue.length} en Alumnos →
                  </Link>
                )}
                {/* TODO: "Recordar a todos". No existe una acción para enviar recordatorios (solo el ajuste de días de aviso). */}
              </div>
            )}
          </SectionCard>

          {pending.length > 0 && (
            <SectionCard title="Clases sueltas por cobrar" count={pending.length}>
              <div className="mt-3">
                <PendingChargesList items={pending.slice(0, PREVIEW_LIMIT)} />
              </div>
            </SectionCard>
          )}
        </div>

        {/* Columna derecha */}
        <div className="space-y-6">
          <SectionCard title="Cobrado por mes">
            <p className="mt-1 text-[13px] text-muted">Últimos 6 meses</p>
            <div className="mt-4">
              <TrendChart trend={trend} selected={label} />
            </div>
          </SectionCard>

          <SectionCard title="Ingresos por plan">
            <PlanIncome items={planIncome} />
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
