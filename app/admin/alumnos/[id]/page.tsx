import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { toISODate, isInPast } from '@/lib/sessions'
import { DayAccordion } from '@/app/alumno/recuperar/[creditId]/day-accordion'

type ClassOption = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  room: string
  profiles: { full_name: string } | null
}

export default async function AdminRecuperarPage({
  params,
}: {
  params: Promise<{ id: string; creditId: string }>
}) {
  const { id: studentId, creditId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user?.id ?? '')
    .maybeSingle()
  if (!callerProfile?.roles?.includes('admin')) redirect('/')

  const { data: credit } = await supabase
    .from('recovery_credits')
    .select('id, student_id, status, class_type_id, week_start, week_end, class_types(name)')
    .eq('id', creditId)
    .maybeSingle()

  if (!credit || credit.student_id !== studentId) notFound()

  const { data: student } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', studentId)
    .maybeSingle()

  if (credit.status !== 'available') {
    return (
      <div className="max-w-md">
        <Link href={`/admin/alumnos/${studentId}`} className="text-sm text-moss hover:text-moss-dark">
          ← Volver
        </Link>
        <p className="mt-6 text-sm text-ink/60">Esta clase a recuperar ya fue usada o venció.</p>
      </div>
    )
  }

  const { data: classesData } = await supabase
    .from('classes')
    .select('id, day_of_week, start_time, end_time, capacity, room, profiles(full_name)')
    .eq('class_type_id', credit.class_type_id)
    .eq('active', true)

  const classes = (classesData ?? []) as unknown as ClassOption[]

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekEnd = new Date(`${credit.week_end}T00:00:00`)

  const days: string[] = []
  const cursor = new Date(today)
  while (cursor <= weekEnd) {
    days.push(toISODate(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  const dayOfWeekFromISO = (iso: string) => new Date(`${iso}T00:00:00`).getDay()

  const optionsByDay = await Promise.all(
    days.map(async (date) => {
      const dow = dayOfWeekFromISO(date)
      const matches = classes.filter((c) => c.day_of_week === dow && !isInPast(date, c.start_time))

      const withOccupancy = await Promise.all(
        matches.map(async (c) => {
          const [{ count: enrolledCount }, { count: cancelledCount }, { count: recoveringCount }] =
            await Promise.all([
              supabase
                .from('enrollments')
                .select('id', { count: 'exact', head: true })
                .eq('class_id', c.id)
                .eq('status', 'active'),
              supabase
                .from('session_cancellations')
                .select('id', { count: 'exact', head: true })
                .eq('class_id', c.id)
                .eq('session_date', date),
              supabase
                .from('attendance')
                .select('id', { count: 'exact', head: true })
                .eq('class_id', c.id)
                .eq('session_date', date)
                .not('recovery_credit_id', 'is', null),
            ])
          const occupied = (enrolledCount ?? 0) - (cancelledCount ?? 0) + (recoveringCount ?? 0)
          return { ...c, sessionDate: date, occupied, hasRoom: occupied < c.capacity }
        })
      )

      return { date, options: withOccupancy.sort((a, b) => a.start_time.localeCompare(b.start_time)) }
    })
  )

  const typeName = (credit.class_types as unknown as { name: string } | null)?.name
  const firstDayWithRoom = optionsByDay.findIndex((d) => d.options.some((o) => o.hasRoom))

  return (
    <div className="max-w-md">
      <Link href={`/admin/alumnos/${studentId}`} className="text-sm text-moss hover:text-moss-dark">
        ← Volver a {student?.full_name}
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-moss">Recuperar clase</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">{typeName}</h1>

      <div className="mt-6 space-y-3">
        {optionsByDay.map((d, i) => (
          <DayAccordion
            key={d.date}
            date={d.date}
            options={d.options}
            studentId={studentId}
            creditId={credit.id}
            redirectTo={`/admin/alumnos/${studentId}`}
            defaultOpen={i === (firstDayWithRoom === -1 ? 0 : firstDayWithRoom)}
          />
        ))}
      </div>
    </div>
  )
}
