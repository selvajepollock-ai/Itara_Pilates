import { createClient } from '@/lib/supabase/server'
import { formatARS } from '@/lib/currency'
import { PageHeader } from '@/app/components/page-header'
import { StatCard } from '@/app/components/stat-card'
import { SectionCard } from '@/app/components/section-card'
import { visibleDays, todayART } from '../horarios/slots'
import { dayTitle } from '../pagos/registro/format'
import { AbsencesCard } from './absences-card'
import { ExportMenu } from './export-menu'
import { IncomeChart } from './income-chart'
import { OccupancyMap, type OccupancyClass } from './occupancy-map'
import { PeriodPicker } from './period-picker'
import { Ranking } from './ranking'
import { buildBuckets, rangeLabel, resolvePeriod, variation } from './format'

const ART = 'America/Argentina/Buenos_Aires'
const dayART = (ts: string) => new Intl.DateTimeFormat('en-CA', { timeZone: ART }).format(new Date(ts))
// Límites del período en hora Argentina (UTC-3, sin horario de verano).
const startOf = (d: string) => `${d}T00:00:00-03:00`
const endOf = (d: string) => `${d}T23:59:59.999-03:00`

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string }>
}) {
  const sp = await searchParams
  const today = todayART()
  const period = resolvePeriod(sp, today)
  const supabase = await createClient()

  const [
    { data: paymentsData },
    { data: dropInData },
    { data: prevPayments },
    { data: prevDropIn },
    { data: classesData },
    { data: enrollmentsData },
    { data: lateCancellations },
    { data: markedAbsences },
  ] = await Promise.all([
    supabase
      .from('payments')
      .select('amount, paid_at, subscriptions(plan_id, plans(name))')
      .is('voided_at', null)
      .gte('paid_at', startOf(period.from))
      .lte('paid_at', endOf(period.to)),
    supabase
      .from('extra_charges')
      .select('amount, paid_at')
      .eq('paid', true)
      .eq('comp', false)
      .gte('paid_at', startOf(period.from))
      .lte('paid_at', endOf(period.to)),
    // Mismo cálculo de ingresos, corrido sobre el período anterior (para la comparación).
    supabase
      .from('payments')
      .select('amount')
      .is('voided_at', null)
      .gte('paid_at', startOf(period.prevFrom))
      .lte('paid_at', endOf(period.prevTo)),
    supabase
      .from('extra_charges')
      .select('amount')
      .eq('paid', true)
      .eq('comp', false)
      .gte('paid_at', startOf(period.prevFrom))
      .lte('paid_at', endOf(period.prevTo)),
    supabase
      .from('classes')
      .select('id, day_of_week, start_time, end_time, room, capacity, class_types(name)')
      .eq('active', true),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
    supabase
      .from('session_cancellations')
      .select('student_id, profiles!attendance_student_id_fkey(full_name)')
      .eq('within_deadline', false)
      .gte('session_date', period.from)
      .lte('session_date', period.to),
    supabase
      .from('attendance')
      .select('student_id, profiles!attendance_student_id_fkey(full_name)')
      .eq('status', 'absent')
      .gte('session_date', period.from)
      .lte('session_date', period.to),
  ])

  // ── Ingresos ────────────────────────────────────────────────────────────────────────────
  const payments = paymentsData ?? []
  const dropIns = dropInData ?? []
  const totalIncome = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const dropInIncome = dropIns.reduce((sum, c) => sum + Number(c.amount), 0)
  const grandTotal = totalIncome + dropInIncome
  const prevTotal =
    (prevPayments ?? []).reduce((s, p) => s + Number(p.amount), 0) + (prevDropIn ?? []).reduce((s, c) => s + Number(c.amount), 0)
  const change = variation(grandTotal, prevTotal)

  const incomeByPlan = new Map<string, number>()
  for (const p of payments) {
    const planName = (p.subscriptions as unknown as { plans: { name: string } | null } | null)?.plans?.name ?? 'Sin plan'
    incomeByPlan.set(planName, (incomeByPlan.get(planName) ?? 0) + Number(p.amount))
  }
  const planRows: [string, number][] = [...incomeByPlan.entries()].sort((a, b) => b[1] - a[1])
  if (dropInIncome > 0) planRows.push(['Clases sueltas', dropInIncome])
  const planTotal = planRows.reduce((s, [, v]) => s + v, 0)

  const buckets = buildBuckets(
    [
      ...payments.map((p) => ({ date: dayART(p.paid_at as string), amount: Number(p.amount) })),
      ...dropIns.map((c) => ({ date: dayART(c.paid_at as string), amount: Number(c.amount) })),
    ],
    period,
    today
  )
  const bestBucket = buckets.reduce<(typeof buckets)[number] | null>((acc, b) => (b.total > (acc?.total ?? 0) ? b : acc), null)
  const bestLabel = bestBucket && period.granularity === 'day' ? dayTitle(bestBucket.key).replace(/^./, (c) => c.toLowerCase()) : null

  // ── Ocupación: foto actual del horario fijo (no varía con el período) ─────────────────────
  // TODO (pendiente de lógica #2 y #3): promedio por semana del período y exclusión de clases canceladas.
  const countByClass = new Map<string, number>()
  for (const e of enrollmentsData ?? []) countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)
  const classes: OccupancyClass[] = (classesData ?? []).map((c) => {
    const enrolled = countByClass.get(c.id) ?? 0
    const capacity = c.capacity as number
    return {
      id: c.id as string,
      dow: c.day_of_week as number,
      start: (c.start_time as string).slice(0, 5),
      end: ((c.end_time as string) ?? (c.start_time as string)).slice(0, 5),
      capacity,
      typeName: (c.class_types as unknown as { name: string } | null)?.name ?? 'Clase',
      instructorName: null,
      fixed: [],
      enrolled,
      pct: capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0,
    }
  })
  const days = visibleDays(classes)
  const avgOccupancy = classes.length > 0 ? Math.round(classes.reduce((s, c) => s + c.pct, 0) / classes.length) : null

  // ── Ausentismo ──────────────────────────────────────────────────────────────────────────
  const absenceByStudent = new Map<string, { name: string; count: number }>()
  for (const row of [...(lateCancellations ?? []), ...(markedAbsences ?? [])]) {
    const name = (row.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Alumno'
    const current = absenceByStudent.get(row.student_id) ?? { name, count: 0 }
    current.count += 1
    absenceByStudent.set(row.student_id, current)
  }
  const absenceAll = [...absenceByStudent.entries()].map(([studentId, v]) => ({ studentId, ...v }))
  const absenceTotal = absenceAll.reduce((s, a) => s + a.count, 0)
  const absenceRanking = absenceAll.sort((a, b) => b.count - a.count).slice(0, 8)

  const registryHref = `/admin/pagos/registro?mes=${period.from.slice(0, 7)}`

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" actions={<ExportMenu from={period.from} to={period.to} />} />

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <PeriodPicker active={period.key} from={period.from} to={period.to} />
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">{rangeLabel(period.from, period.to)}</span> · comparado con{' '}
          {period.prevLabel}
        </p>
      </div>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Ingresos"
          value={formatARS(grandTotal)}
          href={registryHref}
          hint={
            change === null ? (
              `Sin datos de ${period.prevLabel} para comparar`
            ) : (
              <span className={change >= 0 ? 'font-medium text-state-ok-ink' : 'font-medium text-slot-cancel-ink'}>
                {change >= 0 ? '▲' : '▼'} {Math.abs(change)}% vs {period.prevLabel}
              </span>
            )
          }
        />
        <StatCard
          label="Pagos registrados"
          value={payments.length + dropIns.length}
          href={registryHref}
          hint={`${payments.length} ${payments.length === 1 ? 'cuota' : 'cuotas'} · ${dropIns.length} ${dropIns.length === 1 ? 'clase suelta' : 'clases sueltas'}`}
        />
        {avgOccupancy !== null && (
          <StatCard
            label="Ocupación promedio"
            value={`${avgOccupancy}%`}
            href="#ocupacion"
            hint="Horario fijo actual"
          />
        )}
        <StatCard
          label="Ausencias registradas"
          value={absenceTotal}
          href="#ausentismo"
          hint="Avisos tardíos + faltas marcadas"
        />
      </div>

      {/* Ingresos */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <SectionCard title="Ingresos por día">
          <div className="mt-4">
            <IncomeChart buckets={buckets} granularity={period.granularity} registryHref={registryHref} bestLabel={bestLabel} />
          </div>
        </SectionCard>

        <SectionCard title="Por plan">
          {planRows.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Sin ingresos en el período.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {planRows.map(([name, amount]) => {
                const pct = planTotal > 0 ? Math.round((amount / planTotal) * 100) : 0
                return (
                  <li key={name}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate text-ink">{name}</span>
                      <span className="shrink-0 tabular-nums text-ink">
                        {formatARS(amount)} <span className="ml-1 text-muted">{pct}%</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-edge-divider" aria-hidden>
                      <div className="h-full rounded-full bg-moss" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Ocupación */}
      <div id="ocupacion" className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <SectionCard title="Mapa de ocupación por horario">
          <p className="mt-1 text-[13px] text-muted">Horario fijo actual: no varía con el período elegido.</p>
          <div className="mt-4">
            {classes.length === 0 ? (
              <p className="text-sm text-muted">Todavía no hay clases cargadas.</p>
            ) : (
              <OccupancyMap classes={classes} days={days} />
            )}
          </div>
        </SectionCard>

        <SectionCard title="Ranking de clases">
          <div className="mt-3">
            <Ranking classes={classes} />
          </div>
          {/* TODO: "No incluye clases canceladas": hace falta el promedio por fecha (pendiente de lógica #3). */}
        </SectionCard>
      </div>

      <AbsencesCard items={absenceRanking} />
    </div>
  )
}
