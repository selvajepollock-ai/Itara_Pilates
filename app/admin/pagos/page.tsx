import Link from 'next/link'
import { TrendingUp, AlertTriangle, Wallet, Clock, type LucideIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatARS } from '@/lib/currency'
import {
  subscriptionDisplayStatus,
  suggestNextDueDate,
  STATUS_LABEL,
  STATUS_CLASSES,
  type PaymentStatus,
} from '@/lib/billing'
import { collectionSummary } from '@/lib/payments'
import { QuickPayment } from '../quick-payment'

function monthRange(monthParam?: string) {
  const now = new Date()
  const [year, month] = (monthParam ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    .split('-')
    .map(Number)
  const start = new Date(year, month - 1, 1)
  const end = new Date(year, month, 1)
  return { start, end, label: `${year}-${String(month).padStart(2, '0')}` }
}

type PlanRef = { name: string; price: number } | null

type DebtorRow = { studentId: string; name: string; status: PaymentStatus; endDate: string | null; planPrice: number }

function DebtorSection({
  title,
  icon: Icon,
  iconClass,
  status,
  rows,
  limit,
  emptyLabel,
}: {
  title: string
  icon: LucideIcon
  iconClass: string
  status: PaymentStatus
  rows: DebtorRow[]
  limit: number
  emptyLabel: string
}) {
  const preview = rows.slice(0, limit)
  const remaining = rows.length - preview.length

  return (
    <div className="rounded-2xl border border-sand bg-white p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-ink/40">
          <Icon size={15} className={iconClass} />
          <p className="text-xs uppercase tracking-[0.2em]">
            {title} ({rows.length})
          </p>
        </div>
        {rows.length > 0 && (
          <Link href={`/admin/alumnos?estado=${status}`} className="text-xs font-medium text-moss hover:text-moss-dark">
            Ver todos →
          </Link>
        )}
      </div>
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-ink/40">{emptyLabel}</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-sand/60">
            {preview.map((d) => (
              <li key={d.studentId} className="flex items-center justify-between py-2">
                <Link href={`/admin/alumnos/${d.studentId}`} className="text-sm text-ink hover:text-moss">
                  {d.name}
                </Link>
                <span className="text-sm text-ink/50">{formatARS(d.planPrice)}</span>
              </li>
            ))}
          </ul>
          {remaining > 0 && (
            <Link
              href={`/admin/alumnos?estado=${status}`}
              className="mt-2 block text-center text-xs font-medium text-moss hover:text-moss-dark"
            >
              Ver {remaining} más →
            </Link>
          )}
        </>
      )}
    </div>
  )
}

export default async function PagosResumenPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month } = await searchParams
  const { start, end, label } = monthRange(month)
  const supabase = await createClient()

  const sixMonthsAgo = new Date(end.getFullYear(), end.getMonth() - 5, 1)

  const [
    { data: studentsData },
    { data: subsData },
    { data: settings },
    { data: monthPayments },
    { data: trendPayments },
  ] = await Promise.all([
    supabase.from('profiles').select('id, full_name').contains('roles', ['student']),
    supabase
      .from('subscriptions')
      .select('id, student_id, end_date, comp, plans(name, price)')
      .eq('status', 'active'),
    supabase
      .from('studio_settings')
      .select('payment_due_day, payment_reminder_days_before')
      .single(),
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
  ])

  const dueDay = settings?.payment_due_day ?? 10
  const reminderDays = settings?.payment_reminder_days_before ?? 3

  const subs = subsData ?? []
  const students = studentsData ?? []
  const nameById = new Map(students.map((s) => [s.id, s.full_name]))

  // Esperado vs cobrado — los bonificados no se esperan cobrar.
  const expected = subs.reduce(
    (sum, s) => sum + (s.comp ? 0 : Number((s.plans as unknown as PlanRef)?.price ?? 0)),
    0
  )
  const payments = monthPayments ?? []
  const collected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const summary = collectionSummary(expected, collected)

  // Estados de cobranza
  const counts: Record<PaymentStatus, number> = {
    al_dia: 0,
    por_vencer: 0,
    vencido: 0,
    sin_plan: 0,
    bonificado: 0,
  }
  const deudores: {
    studentId: string
    name: string
    status: PaymentStatus
    endDate: string | null
    planPrice: number
  }[] = []
  const studentsWithSub = new Set<string>()

  for (const s of subs) {
    studentsWithSub.add(s.student_id)
    const status = subscriptionDisplayStatus(s, reminderDays)
    counts[status] += 1
    if (status === 'vencido' || status === 'por_vencer') {
      deudores.push({
        studentId: s.student_id,
        name: nameById.get(s.student_id) ?? 'Alumno',
        status,
        endDate: s.end_date,
        planPrice: Number((s.plans as unknown as PlanRef)?.price ?? 0),
      })
    }
  }
  counts.sin_plan = students.filter((s) => !studentsWithSub.has(s.id)).length
  deudores.sort((a, b) => (a.status === b.status ? 0 : a.status === 'vencido' ? -1 : 1))

  // Ingresos por plan
  const incomeByPlan = new Map<string, number>()
  for (const p of payments) {
    const planName =
      (p.subscriptions as unknown as { plans: { name: string } | null } | null)?.plans?.name ?? 'Sin plan'
    incomeByPlan.set(planName, (incomeByPlan.get(planName) ?? 0) + Number(p.amount))
  }

  // Tendencia 6 meses
  const trendMap = new Map<string, number>()
  for (let i = 0; i < 6; i++) {
    const d = new Date(end.getFullYear(), end.getMonth() - 5 + i, 1)
    trendMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0)
  }
  for (const p of trendPayments ?? []) {
    const d = new Date(p.paid_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (trendMap.has(key)) trendMap.set(key, (trendMap.get(key) ?? 0) + Number(p.amount))
  }
  const trend = Array.from(trendMap.entries())
  const trendMax = Math.max(...trend.map(([, v]) => v), 1)

  // Widget "Registrar pago" (mismo componente que el inicio)
  const subByStudent = new Map(subs.map((s) => [s.student_id, s]))
  const quickPaymentStudents = students.map((s) => {
    const sub = subByStudent.get(s.id)
    const planInfo = sub?.plans as unknown as PlanRef
    return {
      id: s.id,
      full_name: s.full_name,
      subscriptionId: sub?.id ?? null,
      planName: planInfo?.name ?? null,
      planPrice: planInfo?.price ?? 0,
      endDate: sub?.end_date ?? null,
      suggestedNextDate: suggestNextDueDate(
        sub?.end_date ? new Date(`${sub.end_date}T00:00:00`) : new Date(),
        dueDay
      ),
    }
  })

  const statusCards: { key: PaymentStatus; value: number }[] = [
    { key: 'al_dia', value: counts.al_dia },
    { key: 'por_vencer', value: counts.por_vencer },
    { key: 'vencido', value: counts.vencido },
    { key: 'sin_plan', value: counts.sin_plan },
    ...(counts.bonificado > 0 ? [{ key: 'bonificado' as const, value: counts.bonificado }] : []),
  ]

  const byOldestFirst = (a: DebtorRow, b: DebtorRow) => (a.endDate ?? '').localeCompare(b.endDate ?? '')
  const vencidos = deudores.filter((d) => d.status === 'vencido').sort(byOldestFirst)
  const porVencer = deudores.filter((d) => d.status === 'por_vencer').sort(byOldestFirst)
  const PREVIEW_LIMIT = 6

  const monthName = new Date(start).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/50 first-letter:uppercase">{monthName}</p>
        <form action="/admin/pagos" method="GET">
          <input
            type="month"
            name="month"
            defaultValue={label}
            className="rounded-full border border-sand px-4 py-2 text-sm text-ink/70 outline-none focus:border-moss"
          />
        </form>
      </div>

      {/* Cobranza del mes */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-sand bg-white p-5">
          <div className="flex items-center gap-2 text-ink/40">
            <TrendingUp size={15} className="text-moss" />
            <p className="text-xs uppercase tracking-[0.2em]">Cobrado</p>
          </div>
          <p className="mt-3 font-display text-3xl italic text-ink">{formatARS(summary.collected)}</p>
          <p className="mt-1 text-xs text-ink/40">{payments.length} pagos</p>
        </div>
        <div className="rounded-2xl border border-sand bg-white p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Esperado</p>
          <p className="mt-3 font-display text-3xl italic text-ink">{formatARS(summary.expected)}</p>
          <p className="mt-1 text-xs text-ink/40">según planes activos</p>
        </div>
        <div className="rounded-2xl border border-sand bg-white p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Cobranza</p>
          <p className="mt-3 font-display text-3xl italic text-ink">{summary.rate}%</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-linen">
            <div
              className={`h-full rounded-full ${summary.rate >= 80 ? 'bg-moss' : 'bg-clay'}`}
              style={{ width: `${Math.min(summary.rate, 100)}%` }}
            />
          </div>
        </div>
        <div className="rounded-2xl border border-sand bg-white p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Falta cobrar</p>
          <p className="mt-3 font-display text-3xl italic text-ink">{formatARS(summary.gap)}</p>
          <p className="mt-1 text-xs text-ink/40">estimado del mes</p>
        </div>
      </div>

      {/* Estados: clickeables, llevan a Alumnos ya filtrado por ese estado */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {statusCards.map(({ key, value }) => (
          <Link
            key={key}
            href={`/admin/alumnos?estado=${key}`}
            className="rounded-2xl border border-sand bg-white p-4 text-center transition hover:border-moss/50 hover:shadow-sm"
          >
            <p className="font-display text-2xl italic text-ink">{value}</p>
            <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium ${STATUS_CLASSES[key]}`}>
              {STATUS_LABEL[key]}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <QuickPayment students={quickPaymentStudents} />

        {/* Tendencia */}
        <div className="rounded-2xl border border-sand bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Últimos 6 meses</p>
          <p className="mt-1 font-display text-xl italic text-ink">Cobrado por mes</p>
          <div className="mt-4 flex items-end gap-2" style={{ height: 120 }}>
            {trend.map(([key, value]) => (
              <div key={key} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={`w-full rounded-t ${key === label ? 'bg-moss' : 'bg-moss/30'}`}
                    style={{ height: `${Math.max((value / trendMax) * 100, 2)}%` }}
                    title={formatARS(value)}
                  />
                </div>
                <span className="text-[10px] text-ink/40">{key.slice(5)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ingresos por plan */}
      <div className="rounded-2xl border border-sand bg-white p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Ingresos por plan</p>
        {incomeByPlan.size === 0 ? (
          <p className="mt-3 text-sm text-ink/40">Sin pagos este mes.</p>
        ) : (
          <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
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
      </div>

      {/* Vencidos y por vencer: secciones separadas (no una sola lista larga), acotadas
          a una vista previa con link a la lista completa y filtrada en Alumnos. */}
      <div className="grid gap-5 lg:grid-cols-2">
        <DebtorSection
          title="Vencidos"
          icon={AlertTriangle}
          iconClass="text-clay"
          status="vencido"
          rows={vencidos}
          limit={PREVIEW_LIMIT}
          emptyLabel="Nadie con la cuota vencida. 🎉"
        />
        <DebtorSection
          title="Por vencer"
          icon={Clock}
          iconClass="text-amber-600"
          status="por_vencer"
          rows={porVencer}
          limit={PREVIEW_LIMIT}
          emptyLabel="Nadie con la cuota por vencer."
        />
      </div>

      <p className="flex items-center gap-1.5 text-xs text-ink/30">
        <Wallet size={12} />
        "Esperado" y "Falta cobrar" son estimados: suman el precio de lista de los planes activos, sin contar recargos ni clases sueltas.
      </p>
    </div>
  )
}
