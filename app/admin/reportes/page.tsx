import { TrendingUp, Users, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'
import { formatARS } from '@/lib/currency'

function getMonthRange(monthParam?: string) {
  const now = new Date()
  const [year, month] = (monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    .split('-')
    .map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  return { start, end, label: `${year}-${String(month).padStart(2, '0')}` }
}

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { start, end, label } = getMonthRange(month)
  const supabase = await createClient()

  const [
    { data: paymentsData },
    { data: classesData },
    { data: enrollmentsData },
    { data: lateCancellations },
    { data: markedAbsences },
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, paid_at, subscriptions(plan_id, plans(name))')
      .gte('paid_at', start.toISOString())
      .lt('paid_at', end.toISOString()),
    supabase
      .from('classes')
      .select('id, day_of_week, start_time, room, capacity, class_types(name)')
      .eq('active', true),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
    supabase
      .from('session_cancellations')
      .select('student_id, profiles(full_name)')
      .eq('within_deadline', false)
      .gte('session_date', start.toISOString().slice(0, 10))
      .lt('session_date', end.toISOString().slice(0, 10)),
    supabase
      .from('attendance')
      .select('student_id, profiles(full_name)')
      .eq('status', 'absent')
      .gte('session_date', start.toISOString().slice(0, 10))
      .lt('session_date', end.toISOString().slice(0, 10)),
  ])

  // Ingresos
  const payments = paymentsData ?? []
  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const incomeByPlan = new Map<string, number>()
  for (const p of payments) {
    const planName =
      (p.subscriptions as unknown as { plans: { name: string } | null } | null)?.plans?.name ??
      'Sin plan'
    incomeByPlan.set(planName, (incomeByPlan.get(planName) ?? 0) + Number(p.amount))
  }

  // Ocupación / demanda por clase
  const countByClass = new Map<string, number>()
  for (const e of enrollmentsData ?? []) {
    countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)
  }
  const classRows = (classesData ?? [])
    .map((c) => {
      const enrolled = countByClass.get(c.id) ?? 0
      return {
        id: c.id,
        label: `${(c.class_types as unknown as { name: string } | null)?.name ?? 'Clase'} · ${DAY_NAMES[c.day_of_week]} ${formatTime(c.start_time)}`,
        room: c.room,
        enrolled,
        capacity: c.capacity,
        pct: c.capacity > 0 ? Math.round((enrolled / c.capacity) * 100) : 0,
      }
    })
    .sort((a, b) => b.pct - a.pct)

  const mostDemanded = classRows.slice(0, 5)
  const leastDemanded = [...classRows].sort((a, b) => a.pct - b.pct).slice(0, 5)

  // Ausentismo
  const absenceByStudent = new Map<string, { name: string; count: number }>()
  for (const row of [...(lateCancellations ?? []), ...(markedAbsences ?? [])]) {
    const name = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Alumno'
    const key = row.student_id
    const current = absenceByStudent.get(key) ?? { name, count: 0 }
    current.count += 1
    absenceByStudent.set(key, current)
  }
  const absenceRanking = Array.from(absenceByStudent.values()).sort((a, b) => b.count - a.count).slice(0, 8)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Reportes</h1>
        </div>
        <form action="/admin/reportes" method="GET">
          <input
            type="month"
            name="month"
            defaultValue={label}
            className="rounded-full border border-sand px-4 py-2 text-sm text-ink/70 outline-none focus:border-moss"
          />
        </form>
      </div>

      <div className="mt-8 rounded-2xl border border-sand bg-white p-6">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-moss" />
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Ingresos del mes</p>
        </div>
        <p className="mt-2 font-display text-4xl italic text-ink">{formatARS(totalIncome)}</p>

        {incomeByPlan.size > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-sand pt-4">
            {Array.from(incomeByPlan.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([plan, amount]) => (
                <li key={plan} className="flex justify-between text-sm text-ink/70">
                  <span>{plan}</span>
                  <span>{formatARS(amount)}</span>
                </li>
              ))}
          </ul>
        )}
        {payments.length === 0 && (
          <p className="mt-3 text-sm text-ink/40">Sin pagos registrados este mes.</p>
        )}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-sand bg-white p-6">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-moss" />
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Clases más demandadas</p>
          </div>
          <ul className="mt-3 space-y-2.5">
            {mostDemanded.map((c) => (
              <li key={c.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">{c.label}</span>
                  <span className="text-ink/50">
                    {c.enrolled}/{c.capacity}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-linen">
                  <div
                    className="h-full rounded-full bg-moss"
                    style={{ width: `${Math.min(c.pct, 100)}%` }}
                  />
                </div>
              </li>
            ))}
            {mostDemanded.length === 0 && (
              <p className="text-sm text-ink/40">Todavía no hay clases con alumnos.</p>
            )}
          </ul>
        </div>

        <div className="rounded-2xl border border-sand bg-white p-6">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-ink/30" />
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Con más lugares libres</p>
          </div>
          <ul className="mt-3 space-y-2.5">
            {leastDemanded.map((c) => (
              <li key={c.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink">{c.label}</span>
                  <span className="text-ink/50">
                    {c.enrolled}/{c.capacity}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-linen">
                  <div
                    className="h-full rounded-full bg-sand"
                    style={{ width: `${Math.min(c.pct, 100)}%` }}
                  />
                </div>
              </li>
            ))}
            {leastDemanded.length === 0 && (
              <p className="text-sm text-ink/40">Todavía no hay clases cargadas.</p>
            )}
          </ul>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-sand bg-white p-6">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-clay" />
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">
            Ausentismo del mes (avisos tardíos + faltas marcadas)
          </p>
        </div>
        {absenceRanking.length === 0 ? (
          <p className="mt-3 text-sm text-ink/40">Sin ausencias registradas este mes.</p>
        ) : (
          <ul className="mt-3 divide-y divide-sand/60">
            {absenceRanking.map((a) => (
              <li key={a.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{a.name}</span>
                <span className="rounded-full bg-clay/10 px-2.5 py-0.5 text-xs font-medium text-clay">
                  {a.count} {a.count === 1 ? 'vez' : 'veces'}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink/30">
          Nota: como tomar asistencia es opcional para instructores, esto puede no reflejar el
          ausentismo real completo — se apoya también en los avisos tardíos de cancelación.
        </p>
      </div>
    </div>
  )
}
