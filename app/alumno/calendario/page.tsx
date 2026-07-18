import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'
import { getMonday, dateForDayOfWeek, toISODate, isInPast } from '@/lib/sessions'

type ClassRow = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  room: string
  class_types: { name: string } | null
  profiles: { full_name: string } | null
}

export default async function AlumnoCalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const studentId = user?.id ?? ''

  const monday = week ? getMonday(new Date(week)) : getMonday(new Date())
  const prevWeek = new Date(monday)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(monday)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const [{ data: classesData }, { data: myEnrollments }, { data: enrollmentsAll }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, day_of_week, start_time, end_time, capacity, room, class_types(name), profiles(full_name)')
      .eq('active', true),
    supabase.from('enrollments').select('class_id').eq('student_id', studentId).eq('status', 'active'),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
  ])

  const allClasses = (classesData ?? []) as unknown as ClassRow[]
  const classes = allClasses.filter((c) => !c.class_types?.name?.toLowerCase().includes('fuerza'))
  const myClassIds = new Set((myEnrollments ?? []).map((e) => e.class_id))
  const countByClass = new Map<string, number>()
  for (const e of enrollmentsAll ?? []) {
    countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)
  }

  const monthLabel = monday.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const byDay = new Map<number, ClassRow[]>()
  for (const day of DAY_ORDER) byDay.set(day, [])
  for (const c of classes) {
    byDay.get(c.day_of_week)?.push(c)
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Calendario</p>
          <h1 className="mt-2 font-display text-2xl italic capitalize text-ink sm:text-3xl">
            {monthLabel}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/alumno/calendario?week=${toISODate(prevWeek)}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink/60 hover:border-moss hover:text-moss"
          >
            <ChevronLeft size={16} />
          </Link>
          <Link
            href="/alumno/calendario"
            className="rounded-full border border-sand px-4 py-2 text-sm font-medium text-ink/70 hover:border-moss hover:text-moss"
          >
            Hoy
          </Link>
          <Link
            href={`/alumno/calendario?week=${toISODate(nextWeek)}`}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-sand text-ink/60 hover:border-moss hover:text-moss"
          >
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

      <p className="mt-4 text-xs text-ink/40">
        Pilates Reformer, todo el estudio. Marcado en verde, tus clases fijas.
      </p>

      <div className="mt-4 space-y-6">
        {DAY_ORDER.map((day) => {
          const dayClasses = byDay.get(day) ?? []
          if (dayClasses.length === 0) return null
          const dayDate = dateForDayOfWeek(monday, day)

          return (
            <section key={day}>
              <h2 className="text-sm font-medium uppercase tracking-wide text-ink/50">
                {DAY_NAMES[day]} <span className="text-ink/30">{dayDate.getDate()}</span>
              </h2>
              <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {dayClasses.map((c) => {
                  const isMine = myClassIds.has(c.id)
                  const enrolled = countByClass.get(c.id) ?? 0
                  const isFull = enrolled >= c.capacity
                  const past = isInPast(toISODate(dayDate), c.start_time)

                  return (
                    <div
                      key={c.id}
                      className={`rounded-xl border px-3.5 py-3 text-sm ${
                        isMine
                          ? 'border-moss bg-moss/5'
                          : past
                            ? 'border-sand/60 opacity-50'
                            : 'border-sand bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display italic text-ink">{formatTime(c.start_time)}</span>
                        {isMine && <span className="text-xs font-medium text-moss">Tuya</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {c.room} · {c.profiles?.full_name ?? 'Sin instructor'}
                      </p>
                      <p className={`mt-1 text-xs ${isFull ? 'text-clay' : 'text-ink/40'}`}>
                        {isFull ? 'Completo' : `${c.capacity - enrolled} libres`}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
