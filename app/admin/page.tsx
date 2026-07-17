import Link from 'next/link'
import { Users, UserCog, CalendarDays, ArrowUpRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [{ count: studentsCount }, { count: instructorsCount }, { count: classesCount }] =
    await Promise.all([
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
    ])

  const stats = [
    { label: 'Alumnos activos', value: studentsCount ?? 0, icon: Users, href: '/admin/alumnos' },
    { label: 'Instructores', value: instructorsCount ?? 0, icon: UserCog, href: '/admin/instructores' },
    { label: 'Clases por semana', value: classesCount ?? 0, icon: CalendarDays, href: '/admin/horarios' },
  ]

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Panel general</p>
      <h1 className="mt-2 font-display text-4xl italic text-ink">Bienvenida al estudio</h1>
      <p className="mt-3 max-w-md text-sm text-ink/60">
        Un vistazo rápido a cómo está el estudio hoy.
      </p>

      <div className="mt-10 grid gap-5 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-sand bg-white p-6 transition hover:border-moss hover:shadow-[0_4px_24px_rgba(46,43,38,0.07)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-moss/10 text-moss">
                <Icon size={18} strokeWidth={2} />
              </div>
              <ArrowUpRight
                size={16}
                className="text-ink/20 transition group-hover:text-moss"
              />
            </div>
            <p className="mt-5 font-display text-4xl italic text-ink">{value}</p>
            <p className="mt-1 text-sm text-ink/50">{label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-sand bg-white p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Próximo paso</p>
          <p className="mt-2 font-display text-xl italic text-ink">Cuotas y bonos</p>
          <p className="mt-1 text-sm text-ink/50">
            Todavía no está armado — es lo próximo que vamos a construir.
          </p>
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
