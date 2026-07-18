import Link from 'next/link'
import { Plus, Settings2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'
import { DeleteClassButton } from '../delete-class-button'

type ClassRow = {
  id: string
  room: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  class_types: { name: string } | null
  profiles: { full_name: string } | null
}

export default async function HorariosPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('classes')
    .select(
      'id, room, day_of_week, start_time, end_time, capacity, class_types(name), profiles(full_name)'
    )
    .eq('active', true)
    .order('start_time', { ascending: true })

  const classes = (data ?? []) as unknown as ClassRow[]

  const byDay = new Map<number, typeof classes>()
  for (const day of DAY_ORDER) byDay.set(day, [])
  for (const c of classes ?? []) {
    byDay.get(c.day_of_week)?.push(c)
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Horarios</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/horarios"
            className="flex items-center gap-1.5 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
          >
            ← Ver calendario
          </Link>
          <Link
            href="/admin/tipos-de-clase"
            className="flex items-center gap-1.5 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
          >
            <Settings2 size={15} strokeWidth={2} />
            Tipos de clase
          </Link>
          <Link
            href="/admin/horarios/nuevo"
            className="flex items-center gap-1.5 rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nueva clase
          </Link>
        </div>
      </div>

      <div className="mt-10 space-y-10">
        {DAY_ORDER.map((day) => {
          const dayClasses = byDay.get(day) ?? []
          if (dayClasses.length === 0) return null

          return (
            <section key={day}>
              <div className="flex items-center gap-4">
                <h2 className="font-display text-xl italic text-ink">{DAY_NAMES[day]}</h2>
                <div className="h-px flex-1 bg-sand" />
              </div>

              <ul className="mt-4 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
                {dayClasses.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                  >
                    <div className="flex min-w-0 flex-1 items-baseline gap-3">
                      <span className="font-display text-lg italic text-ink">
                        {c.class_types?.name ?? 'Clase'}
                      </span>
                      <span className="flex-1 border-b border-dotted border-sand" />
                      <span className="whitespace-nowrap text-sm tabular-nums text-ink/70">
                        {formatTime(c.start_time)}–{formatTime(c.end_time)}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-ink/50">
                      <span className="rounded-full bg-blush px-2.5 py-1">{c.room}</span>
                      <span>{c.profiles?.full_name ?? 'Sin instructor'}</span>
                      <span>· {c.capacity} cupos</span>
                      <Link
                        href={`/admin/horarios/${c.id}`}
                        className="font-medium text-moss hover:text-moss-dark"
                      >
                        Alumnos
                      </Link>
                      <Link
                        href={`/admin/horarios/${c.id}/editar`}
                        className="font-medium text-moss hover:text-moss-dark"
                      >
                        Editar
                      </Link>
                      <DeleteClassButton classId={c.id} />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}

        {(!classes || classes.length === 0) && (
          <div className="rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-16 text-center">
            <p className="font-display text-xl italic text-ink">Todavía no hay clases cargadas</p>
            <p className="mt-2 text-sm text-ink/60">
              Creá la primera clase para armar el horario semanal del estudio.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
