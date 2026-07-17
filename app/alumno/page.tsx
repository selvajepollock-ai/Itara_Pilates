import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'

type MyClassRow = {
  id: string
  class_id: string
  classes: {
    room: string
    day_of_week: number
    start_time: string
    end_time: string
    class_types: { name: string } | null
    profiles: { full_name: string } | null
  } | null
}

export default async function AlumnoDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('enrollments')
    .select('id, class_id, classes(room, day_of_week, start_time, end_time, class_types(name), profiles(full_name))')
    .eq('student_id', user?.id ?? '')
    .eq('status', 'active')

  const enrollments = (data ?? []) as unknown as MyClassRow[]

  const byDay = new Map<number, MyClassRow[]>()
  for (const day of DAY_ORDER) byDay.set(day, [])
  for (const e of enrollments) {
    if (!e.classes) continue
    byDay.get(e.classes.day_of_week)?.push(e)
  }

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Mi semana</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink sm:text-4xl">Tu horario</h1>

      <div className="mt-8 space-y-6">
        {DAY_ORDER.map((day) => {
          const dayClasses = byDay.get(day) ?? []
          if (dayClasses.length === 0) return null

          return (
            <section key={day}>
              <h2 className="text-sm font-medium uppercase tracking-wide text-ink/50">
                {DAY_NAMES[day]}
              </h2>
              <div className="mt-2 space-y-3">
                {dayClasses.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center justify-between rounded-2xl border border-sand bg-white px-5 py-4 shadow-[0_2px_12px_rgba(46,43,38,0.04)]"
                  >
                    <div>
                      <p className="font-display text-lg italic text-ink">
                        {e.classes?.class_types?.name}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {e.classes?.room} · {e.classes?.profiles?.full_name ?? 'Sin instructor'}
                      </p>
                    </div>
                    <span className="whitespace-nowrap rounded-full bg-blush px-3 py-1.5 text-sm tabular-nums text-ink">
                      {formatTime(e.classes?.start_time ?? '')}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )
        })}

        {enrollments.length === 0 && (
          <div className="rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-14 text-center">
            <p className="font-display text-xl italic text-ink">Todavía no tenés clases asignadas</p>
            <p className="mt-2 text-sm text-ink/60">
              Hablá con el estudio para que te anoten a tu horario fijo.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
