import Link from 'next/link'
import { Users, UserCog, CalendarDays, ArrowUpRight, Cake, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { daysUntilNextBirthday, formatBirthday } from '@/lib/birthdays'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [
    { count: studentsCount },
    { count: instructorsCount },
    { count: classesCount },
    { data: birthdayData },
    { data: myProfile },
    { count: overdueCount },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .contains('roles', ['student']),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .contains('roles', ['instructor']),
    supabase
      .from('classes')
      .select('id', { count: 'exact', head: true })
      .eq('active', true),
    supabase
      .from('profiles')
      .select('id, full_name, birth_date')
      .contains('roles', ['student'])
      .not('birth_date', 'is', null),
    supabase.from('profiles').select('full_name').eq('id', user?.id ?? '').single(),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .lt('end_date', new Date().toISOString().slice(0, 10)),
  ])

  const firstName = myProfile?.full_name?.split(' ')[0]

  const stats = [
    { label: 'Alumnos activos', value: studentsCount ?? 0, icon: Users, href: '/admin/alumnos' },
    { label: 'Instructores', value: instructorsCount ?? 0, icon: UserCog, href: '/admin/instructores' },
    { label: 'Clases por semana', value: classesCount ?? 0, icon: CalendarDays, href: '/admin/horarios' },
    {
      label: 'Cuotas vencidas',
      value: overdueCount ?? 0,
      icon: AlertCircle,
      href: '/admin/alumnos',
      alert: (overdueCount ?? 0) > 0,
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

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
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
          <p className="mt-2 font-display text-xl italic text-ink">Reportes</p>
          <p className="mt-1 text-sm text-ink/50">
            Ocupación, ingresos y ausentismo — pendiente.
          </p>
        </div>
      </div>
    </div>
  )
}
