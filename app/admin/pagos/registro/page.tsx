import { createClient } from '@/lib/supabase/server'
import { RegistroView } from './registro-view'
import { todayART } from '../../horarios/slots'
import type { RegistroRow } from './types'

const ART = 'America/Argentina/Buenos_Aires'
const dayART = (ts: string) => new Intl.DateTimeFormat('en-CA', { timeZone: ART }).format(new Date(ts))

type SubRef = { student_id: string; plans: { name: string } | null } | null

export default async function RegistroPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams
  const today = todayART()
  const month = /^\d{4}-\d{2}$/.test(mes ?? '') ? (mes as string) : today.slice(0, 7)

  // Límites del mes en hora Argentina (UTC-3, sin horario de verano).
  const [y, m] = month.split('-').map(Number)
  const next = new Date(Date.UTC(y, m, 1))
  const nextMonth = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`
  const from = `${month}-01T00:00:00-03:00`
  const to = `${nextMonth}-01T00:00:00-03:00`

  const supabase = await createClient()
  const [{ data: paymentsData }, { data: extrasData }, { data: profilesData }] =
    await Promise.all([
      supabase
        .from('payments')
        .select(
          'id, amount, paid_at, notes, voided_at, voided_reason, recorded_by, subscription_id, subscriptions(student_id, plans(name))'
        )
        .gte('paid_at', from)
        .lt('paid_at', to)
        .order('paid_at', { ascending: false }),
      // Solo las clases sueltas pagadas son un cobro; las pendientes se ven en Resumen.
      supabase
        .from('extra_charges')
        .select('id, description, amount, paid_at, student_id, profiles(full_name)')
        .eq('paid', true)
        .eq('comp', false)
        .gte('paid_at', from)
        .lt('paid_at', to)
        .order('paid_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name'),
    ])

  const nameById = new Map((profilesData ?? []).map((p) => [p.id as string, p.full_name as string]))

  const rows: RegistroRow[] = []
  for (const r of paymentsData ?? []) {
    const sub = r.subscriptions as unknown as SubRef
    rows.push({
      id: r.id as string,
      kind: 'cuota',
      date: dayART(r.paid_at as string),
      paidAt: r.paid_at as string,
      studentId: sub?.student_id ?? null,
      studentName: sub?.student_id ? nameById.get(sub.student_id) ?? 'Alumno' : 'Alumno',
      concept: sub?.plans?.name ?? 'Cuota',
      note: (r.notes as string | null) ?? '',
      amount: Number(r.amount),
      recordedById: (r.recorded_by as string | null) ?? null,
      recordedByName: r.recorded_by ? nameById.get(r.recorded_by as string) ?? null : null,
      voided: Boolean(r.voided_at),
      voidedReason: (r.voided_reason as string | null) ?? '',
    })
  }
  for (const r of extrasData ?? []) {
    rows.push({
      id: r.id as string,
      kind: 'suelta',
      date: dayART(r.paid_at as string),
      paidAt: r.paid_at as string,
      studentId: (r.student_id as string | null) ?? null,
      studentName: (r.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Alumno',
      concept: (r.description as string) ?? 'Clase suelta',
      note: '',
      amount: Number(r.amount),
      // TODO: extra_charges no guarda quién registró el cobro.
      recordedById: null,
      recordedByName: null,
      voided: false,
      voidedReason: '',
    })
  }
  rows.sort((a, b) => b.paidAt.localeCompare(a.paidAt))

  return <RegistroView month={month} today={today} rows={rows} />
}
