import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'

type ClassRow = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  room: string
  capacity: number
  class_types: { name: string } | null
}

export default async function InstructorDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: classesData } = await supabase
    .from('classes')
    .select('id, day_of_week, start_time, end_time, room, capacity, class_types(name)')
    .eq('instructor_id', user?.id ?? '')
    .eq('active', true)

  const { data: enrollmentsData } = await supabase.from('enrollments').select('class_id').eq('status', 'active')

  const classes = (classesData ?? []) as unknown as ClassRow[]
  const countByClass = new Map<string, number>()
  for (const e of enrollmentsData ?? []) {
    countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)
  }

  const byDay = new Map<number, ClassRow[]>()
  for (const day of DAY_ORDER) byDay.set(day, [])
  for (const c of classes) {
    byDay.get(c.day_of_week)?.push(c)
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const activeDays = DAY_ORDER.filter((day) => (byDay.get(day)?.length ?? 0) > 0)

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Hoy</p>
      <h1 className="mt-2 font-display text-4xl italic text-ink">Tu agenda</h1>
      <p className="mt-3 max-w-md text-sm text-ink/60">
        Tus clases de la semana. Entrá a cada una para ver quién va y, si querés, marcar asistencia.
      </p>

      {activeDays.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-14 text-center">
          <p className="font-display text-xl italic text-ink">Todavía no tenés clases asignadas</p>
          <p className="mt-2 text-sm text-ink/60">El estudio te va a asignar tus horarios.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-8">
          {activeDays.map((day) => (
            <section key={day}>
              <div className="flex items-center gap-4">
                <h2 className="font-display text-xl italic text-ink">{DAY_NAMES[day]}</h2>
                <div className="h-px flex-1 bg-sand" />
              </div>
              <ul className="mt-3 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
                {byDay.get(day)?.map((c) => {
                  const enrolled = countByClass.get(c.id) ?? 0
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/instructor/clases/${c.id}`}
                        className="flex items-center justify-between px-5 py-4 transition hover:bg-linen/50"
                      >
                        <div>
                          <p className="font-display text-lg italic text-ink">
                            {c.class_types?.name}
                          </p>
                          <p className="mt-0.5 text-xs text-ink/50">
                            {formatTime(c.start_time)}–{formatTime(c.end_time)} · {c.room}
                          </p>
                        </div>
                        <span className="text-xs text-ink/40">
                          {enrolled}/{c.capacity} alumnos
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
