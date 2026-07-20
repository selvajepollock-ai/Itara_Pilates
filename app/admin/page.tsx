import Link from 'next/link'
import { Users, UserCog, CalendarDays, ArrowUpRight, Cake, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { daysUntilNextBirthday, formatBirthday } from '@/lib/birthdays'
import { suggestNextDueDate } from '@/lib/billing'
import { DAY_NAMES } from '@/lib/day-names'
import { QuickPayment } from './quick-payment'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { data: studentsData },
    { count: instructorsCount },
    { data: classesData },
    { data: birthdayData },
    { data: myProfile },
    { data: subscriptionsData },
    { data: settings },
    { data: enrollmentsData },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name')
      .contains('roles', ['student']),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .contains('roles', ['instructor']),
    supabase
      .from('classes')
      .select('id, day_of_week, capacity, class_types(name)')
      .eq('active', true),
    supabase
      .from('profiles')
      .select('id, full_name, birth_date')
      .contains('roles', ['student'])
      .not('birth_date', 'is', null),
    supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').single(),
    supabase.from('subscriptions').select('id, student_id, end_date, plans(name, price)').eq('status', 'active'),
    supabase.from('studio_settings').select('payment_due_day').single(),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
  ])

  const firstName = myProfile?.full_name?.split(' ')[0]
  const studentsCount = studentsData?.length ?? 0
  const classesCount = classesData?.length ?? 0

  const today = new Date().toISOString().slice(0, 10)
  const overdueCount = (subscriptionsData ?? []).filter((s) => s.end_date < today).length

  const stats = [
    { label: 'Alumnos activos', value: studentsCount, icon: Users, href: '/admin/alumnos' },
    { label: 'Instructores', value: instructorsCount ?? 0, icon: UserCog, href: '/admin/instructores' },
    { label: 'Clases por semana', value: classesCount, icon: CalendarDays, href: '/admin/horarios' },
    {
      label: 'Cuotas vencidas',
      value: overdueCount,
      icon: AlertCircle,
      href: '/admin/alumnos',
      alert: overdueCount > 0,
    },
  ]

  const upcomingBirthdays = (birthdayData ?? [])
    .filter((s) => s.birth_date)
    .map((s) => ({
      name: s.full_name,
      birthDate: s.birth_date as string,
      daysUntil: daysUntilNextBirthday(s.birth_date as string),
    }))
    .filter((s) => s.daysUntil <= 30)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 5)

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

  // Datos para el widget de pago rápido
  const subByStudent = new Map((subscriptionsData ?? []).map((s) => [s.student_id, s]))
  const dueDay = settings?.payment_due_day ?? 10
  const quickPaymentStudents = (studentsData ?? []).map((s) => {
    const sub = subByStudent.get(s.id)
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

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Panel general</p>
      <h1 className="mt-2 font-display text-4xl italic text-ink">
        {firstName && firstName !== 'Sin' ? `Bienvenida, ${firstName}` : 'Bienvenida al estudio'}
      </h1>
      <p className="mt-3 max-w-md text-sm text-ink/60">
        Un vistazo rápido a cómo está el estudio hoy.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, href, alert }) => (
          <Link
            key={label}
            href={href}
            className={`group rounded-2xl border bg-white p-6 transition hover:shadow-[0_4px_24px_rgba(46,43,38,0.07)] ${
              alert ? 'border-clay/40 hover:border-clay' : 'border-sand hover:border-moss'
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  alert ? 'bg-clay/10 text-clay' : 'bg-moss/10 text-moss'
                }`}
              >
                <Icon size={18} strokeWidth={2} />
              </div>
              <ArrowUpRight
                size={16}
                className={`text-ink/20 transition ${alert ? 'group-hover:text-clay' : 'group-hover:text-moss'}`}
              />
            </div>
            <p className={`mt-5 font-display text-4xl italic ${alert ? 'text-clay' : 'text-ink'}`}>
              {value}
            </p>
            <p className="mt-1 text-sm text-ink/50">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <QuickPayment students={quickPaymentStudents} />

        <div className="rounded-2xl border border-sand bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Esta semana</p>
          <p className="mt-1 font-display text-xl italic text-ink">Ocupación Pilates Reformer</p>

          <div className="mt-4 space-y-3">
            {occupancyByDay.map(({ day, capacity, enrolled, pct }) => (
              <div key={day}>
                <div className="flex items-center justify-between text-xs text-ink/50">
                  <span>{DAY_NAMES[day]}</span>
                  <span>
                    {enrolled}/{capacity}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-linen">
                  <div
                    className={`h-full rounded-full ${pct >= 90 ? 'bg-clay' : 'bg-moss'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {capacityIsZero(occupancyByDay) && (
              <p className="text-sm text-ink/40">Todavía no hay alumnos anotados en el horario.</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-sand bg-white p-6">
          <div className="flex items-center gap-2">
            <Cake size={16} strokeWidth={2} className="text-clay" />
            <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Próximos cumpleaños</p>
          </div>

          {upcomingBirthdays.length === 0 ? (
            <p className="mt-3 text-sm text-ink/40">Nada en los próximos 30 días.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {upcomingBirthdays.map((b) => (
                <li key={b.name} className="flex items-center justify-between text-sm">
                  <span className="text-ink">{b.name}</span>
                  <span className="text-ink/50">
                    {b.daysUntil === 0 ? '🎉 hoy' : formatBirthday(b.birthDate)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-sand bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Próximo paso</p>
          <p className="mt-2 font-display text-xl italic text-ink">Notificaciones masivas</p>
          <p className="mt-1 text-sm text-ink/50">
            Avisos generales a todo el estudio — pendiente.
          </p>
        </div>
      </div>
    </div>
  )
}

function capacityIsZero(rows: { capacity: number }[]) {
  return rows.every((r) => r.capacity === 0)
}
