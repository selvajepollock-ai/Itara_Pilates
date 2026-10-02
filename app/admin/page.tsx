import Link from 'next/link'
import { AlertCircle, CalendarPlus, Users2, Wallet } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { daysUntilNextBirthday } from '@/lib/birthdays'
import { suggestNextDueDate, getDisplayStatus, subscriptionDisplayStatus } from '@/lib/billing'
import { collectionSummary } from '@/lib/payments'
import { formatARS } from '@/lib/currency'
import { PageHeader } from '@/app/components/page-header'
import { StatCard } from '@/app/components/stat-card'
import { SectionCard } from '@/app/components/section-card'
import { ProgressBar } from '@/app/components/progress-bar'
import { AttentionItem } from '@/app/components/attention-item'
import { MoneyPrivacyProvider, Private, PrivacyToggleButton } from './pagos/privacy'
import { RegisterPaymentDialog } from './inicio/register-payment-dialog'
import { TodayClasses } from './inicio/today-classes'
import { MobileQuickActions } from './inicio/mobile-quick-actions'
import { OccupancyWeek } from './inicio/occupancy-week'
import { BirthdaysCard, type BirthdayRow } from './inicio/birthdays-card'
import type { TodayClass } from './inicio/today-status'

const TZ = 'America/Argentina/Buenos_Aires'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000)
const hhmm = (t: string) => t.slice(0, 5)

export default async function AdminDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // "Hoy" en hora argentina (el servidor corre en UTC).
  const now = new Date()
  const todayYMD = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(now)
  const todayDate = new Date(`${todayYMD}T00:00:00Z`)
  const todayDow = todayDate.getUTCDay()
  const monday = addDays(todayDate, -((todayDow + 6) % 7))
  const weekDates = Array.from({ length: 7 }, (_, i) => iso(addDays(monday, i)))
  const weekStartISO = weekDates[0]
  const weekEndISO = weekDates[6]
  const dateForDow = (dow: number) => weekDates[(dow + 6) % 7]

  // Mismo rango de mes que usa Pagos, para que "Cobrado" coincida.
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [
    { data: studentsData },
    { data: classesData },
    { data: birthdayData },
    { data: myProfile },
    { data: subscriptionsData },
    { data: settings },
    { data: enrollmentsData },
    { data: monthPayments },
    { data: weekCancellations },
    { data: weekRecoveries },
    { data: wholeCancellations },
    { data: holidays },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name')
      .contains('roles', ['student']),
    supabase
      .from('classes')
      .select('id, day_of_week, start_time, end_time, capacity, class_types(name)')
      .eq('active', true),
    supabase
      .from('profiles')
      .select('id, full_name, birth_date, phone')
      .contains('roles', ['student'])
      .not('birth_date', 'is', null),
    supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').single(),
    supabase.from('subscriptions').select('id, student_id, end_date, comp, plans(name, price)').eq('status', 'active'),
    supabase.from('studio_settings').select('payment_due_day, payment_reminder_days_before').single(),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
    supabase
      .from('payments')
      .select('amount')
      .is('voided_at', null)
      .gte('paid_at', monthStart.toISOString())
      .lt('paid_at', monthEnd.toISOString()),
    supabase
      .from('session_cancellations')
      .select('class_id, session_date')
      .gte('session_date', weekStartISO)
      .lte('session_date', weekEndISO),
    supabase
      .from('attendance')
      .select('class_id, session_date')
      .not('recovery_credit_id', 'is', null)
      .gte('session_date', weekStartISO)
      .lte('session_date', weekEndISO),
    supabase
      .from('class_cancellations')
      .select('class_id, session_date')
      .gte('session_date', weekStartISO)
      .lte('session_date', weekEndISO),
    supabase
      .from('holidays')
      .select('date, label')
      .gte('date', weekStartISO)
      .lte('date', weekEndISO),
  ])

  const firstName = myProfile?.full_name?.split(' ')[0]
  const studentsCount = studentsData?.length ?? 0
  const reminderDays = settings?.payment_reminder_days_before ?? 3

  // Un alumno no debería tener más de una suscripción activa, pero por las dudas
  // (datos viejos, carrera del formulario) contamos una sola vez por alumno.
  const subsByStudent = new Map<string, NonNullable<typeof subscriptionsData>[number]>()
  for (const s of subscriptionsData ?? []) {
    const prev = subsByStudent.get(s.student_id)
    if (!prev || s.end_date > prev.end_date) subsByStudent.set(s.student_id, s)
  }
  const subs = [...subsByStudent.values()]
  const overdueCount = subs.filter((s) => !s.comp && getDisplayStatus(s.end_date) === 'vencido').length
  const alDiaCount = subs.filter((s) => subscriptionDisplayStatus(s, reminderDays) === 'al_dia').length
  const sinPlanCount = (studentsData ?? []).filter((s) => !subsByStudent.has(s.id)).length

  // Cobrado vs esperado del mes (mismo cálculo que Pagos).
  type PlanRef = { name: string; price: number } | null
  const expected = subs.reduce((sum, s) => sum + (s.comp ? 0 : Number((s.plans as unknown as PlanRef)?.price ?? 0)), 0)
  const payments = monthPayments ?? []
  const collected = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const summary = collectionSummary(expected, collected)

  const dueDay = settings?.payment_due_day ?? 10
  const monthNumber = Number(todayYMD.slice(5, 7))
  const monthName = new Intl.DateTimeFormat('es-AR', { month: 'long', timeZone: TZ }).format(now)

  // Ocupación semanal (Pilates Reformer, Lun-Vie)
  const enrollCountByClass = new Map<string, number>()
  for (const e of enrollmentsData ?? []) {
    enrollCountByClass.set(e.class_id, (enrollCountByClass.get(e.class_id) ?? 0) + 1)
  }
  const reformerClasses = (classesData ?? []).filter(
    (c) => !(c.class_types as unknown as { name: string } | null)?.name?.toLowerCase().includes('fuerza')
  )
  const occupancyByDay = [1, 2, 3, 4, 5].map((day) => {
    const dayClasses = reformerClasses.filter((c) => c.day_of_week === day)
    const capacity = dayClasses.reduce((sum, c) => sum + c.capacity, 0)
    const enrolled = dayClasses.reduce((sum, c) => sum + (enrollCountByClass.get(c.id) ?? 0), 0)
    return { day, capacity, enrolled, pct: capacity > 0 ? Math.round((enrolled / capacity) * 100) : 0 }
  })
  const weekCapacity = occupancyByDay.reduce((s, d) => s + d.capacity, 0)
  const weekEnrolled = occupancyByDay.reduce((s, d) => s + d.enrolled, 0)
  const weekPct = weekCapacity > 0 ? Math.round((weekEnrolled / weekCapacity) * 100) : 0

  // Cancelaciones / recuperaciones por clase y fecha (misma lógica que Horarios).
  const key = (classId: string, date: string) => `${classId}|${date}`
  const cancelledCount = new Map<string, number>()
  for (const c of weekCancellations ?? []) {
    cancelledCount.set(key(c.class_id, c.session_date), (cancelledCount.get(key(c.class_id, c.session_date)) ?? 0) + 1)
  }
  const recoveringCount = new Map<string, number>()
  for (const r of weekRecoveries ?? []) {
    recoveringCount.set(key(r.class_id, r.session_date), (recoveringCount.get(key(r.class_id, r.session_date)) ?? 0) + 1)
  }
  const wholeCancelled = new Set((wholeCancellations ?? []).map((c) => key(c.class_id, c.session_date)))
  const holidayByDate = new Map((holidays ?? []).map((h) => [h.date as string, (h.label as string | null) ?? '']))

  // Lugares liberados por cancelaciones esta semana (solo sirven para recuperar).
  let freedSpots = 0
  for (const c of reformerClasses) {
    const date = dateForDow(c.day_of_week)
    if (holidayByDate.has(date) || wholeCancelled.has(key(c.id, date))) continue
    freedSpots += Math.max((cancelledCount.get(key(c.id, date)) ?? 0) - (recoveringCount.get(key(c.id, date)) ?? 0), 0)
  }

  // Clases de hoy
  const todayHoliday = holidayByDate.has(todayYMD) ? holidayByDate.get(todayYMD)! : null
  const todayClasses: TodayClass[] = reformerClasses
    .filter((c) => c.day_of_week === todayDow)
    .map((c) => {
      const k = key(c.id, todayYMD)
      return {
        id: c.id,
        name: (c.class_types as unknown as { name: string } | null)?.name ?? 'Clase',
        start: hhmm(c.start_time),
        end: hhmm(c.end_time),
        enrolled: (enrollCountByClass.get(c.id) ?? 0) - (cancelledCount.get(k) ?? 0) + (recoveringCount.get(k) ?? 0),
        capacity: c.capacity,
        cancelled: wholeCancelled.has(k),
      }
    })

  // Cumpleaños (próximos 30 días)
  const weekdayDay = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', timeZone: 'UTC' })
  const birthdayRows: BirthdayRow[] = (birthdayData ?? [])
    .filter((s) => s.birth_date)
    .map((s) => ({
      name: s.full_name as string,
      daysUntil: daysUntilNextBirthday(s.birth_date as string, new Date(`${todayYMD}T12:00:00`)),
      phone: (s.phone as string | null) ?? null,
    }))
    .filter((s) => s.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5)
    .map((s) => {
      const label = weekdayDay.format(addDays(todayDate, s.daysUntil))
      return { ...s, dateLabel: label.charAt(0).toUpperCase() + label.slice(1) }
    })

  // Datos para el modal "Registrar pago" (mismo componente que antes)
  const quickPaymentStudents = (studentsData ?? []).map((s) => {
    const sub = subsByStudent.get(s.id)
    const planInfo = sub?.plans as unknown as { name: string; price: number } | null
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

  // Requiere tu atención (los ítems en 0 no se muestran)
  const attention = [
    overdueCount > 0 && {
      key: 'overdue',
      icon: <Wallet size={16} />,
      title: `${overdueCount} ${overdueCount === 1 ? 'cuota sin pagar' : 'cuotas sin pagar'}`,
      subtitle: `Recargo desde el ${dueDay + 1}/${monthNumber}`,
      href: '/admin/pagos',
      actionLabel: 'Ver pagos',
    },
    sinPlanCount > 0 && {
      key: 'sin-plan',
      icon: <Users2 size={16} />,
      title: `${sinPlanCount} ${sinPlanCount === 1 ? 'alumno sin plan' : 'alumnos sin plan'}`,
      subtitle: 'Asignales un plan para poder cobrarles',
      href: '/admin/alumnos?estado=sin_plan',
      actionLabel: 'Ver alumnos',
    },
    freedSpots > 0 && {
      key: 'freed',
      icon: <CalendarPlus size={16} />,
      title: `${freedSpots} ${freedSpots === 1 ? 'lugar liberado' : 'lugares liberados'} por cancelaciones`,
      subtitle: 'Esta semana · sirven para recuperar clases',
      href: '/admin/horarios',
      actionLabel: 'Ver horarios',
    },
  ].filter(Boolean) as {
    key: string
    icon: React.ReactNode
    title: string
    subtitle: string
    href: string
    actionLabel: string
  }[]

  const todayLabel = (() => {
    const p = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: TZ }).formatToParts(now)
    const get = (t: string) => p.find((x) => x.type === t)?.value ?? ''
    return `${get('weekday')} ${get('day')} de ${get('month')}`
  })()

  const headerButton =
    'inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-[18px] text-sm font-semibold transition'

  return (
    <MoneyPrivacyProvider>
      <div className="space-y-6">
        <PageHeader
          eyebrow={todayLabel}
          title={firstName && firstName !== 'Sin' ? `Hola, ${firstName}` : 'Bienvenido/a al estudio'}
          actions={
            <div className="hidden items-center gap-2.5 md:flex">
              <Link
                href="/admin/horarios/nuevo"
                className={`${headerButton} border border-edge-strong bg-white text-ink hover:border-moss hover:text-moss`}
              >
                Nueva clase
              </Link>
              <RegisterPaymentDialog
                students={quickPaymentStudents}
                className={`${headerButton} bg-moss text-white hover:bg-moss-dark`}
              >
                <Wallet size={16} />
                Registrar pago
              </RegisterPaymentDialog>
            </div>
          }
        />

        <MobileQuickActions classes={todayClasses} students={quickPaymentStudents} />

        <section aria-labelledby="resumen-mes">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="resumen-mes" className="font-display text-[22px] font-normal italic text-ink">
              Resumen del mes
            </h2>
            <PrivacyToggleButton />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            <StatCard
              label="Alumnos activos"
              value={studentsCount}
              hint={`${alDiaCount} al día · ${sinPlanCount} sin plan`}
              href="/admin/alumnos"
            />
            <StatCard
              label={`Cobrado en ${monthName}`}
              value={<Private mask="$ ••••••">{formatARS(summary.collected)}</Private>}
              href="/admin/pagos"
              hint={
                <>
                  {summary.rate}% de <Private mask="$ ••••••">{formatARS(summary.expected)}</Private> · {payments.length}{' '}
                  {payments.length === 1 ? 'pago' : 'pagos'}
                </>
              }
            >
              <ProgressBar value={summary.rate} label="Cobranza del mes" />
            </StatCard>
            <StatCard
              label="Cuotas vencidas"
              value={overdueCount}
              tone={overdueCount > 0 ? 'danger' : 'default'}
              hint={`Vencieron el 1/${monthNumber} · recargo desde el ${dueDay + 1}/${monthNumber}`}
              href="/admin/alumnos?estado=vencido"
            />
            <StatCard
              label="Ocupación de la semana"
              value={`${weekPct}%`}
              hint={`${weekEnrolled} de ${weekCapacity} lugares · ${Math.max(weekCapacity - weekEnrolled, 0)} libres`}
              href="/admin/horarios"
            />
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
          <SectionCard title="Hoy" className="min-w-0">
            <TodayClasses classes={todayClasses} holidayLabel={todayHoliday} />
          </SectionCard>

          <div className="space-y-5">
            <SectionCard title="Requiere tu atención" count={attention.length}>
              {attention.length === 0 ? (
                <p className="flex items-center gap-2 py-3 text-sm text-muted">
                  <AlertCircle size={16} className="text-moss" />
                  Todo al día.
                </p>
              ) : (
                <ul className="divide-y divide-edge-divider">
                  {attention.map(({ key: k, ...item }) => (
                    <AttentionItem key={k} {...item} />
                  ))}
                </ul>
              )}
            </SectionCard>

            <BirthdaysCard rows={birthdayRows} />
          </div>
        </div>

        <OccupancyWeek days={occupancyByDay} todayDow={todayDow} />
      </div>
    </MoneyPrivacyProvider>
  )
}
