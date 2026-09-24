import { createClient } from '@/lib/supabase/server'
import { suggestNextDueDate } from '@/lib/billing'
import { DAY_ORDER } from '@/lib/day-names'
import { NewStudentForm } from './new-student-form'
import type { ClassOption } from '../[id]/schedule-form'

type ClassRow = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  pending_extra_capacity: number
  room: string
  instructor_id: string | null
  class_types: { name: string } | null
  profiles: { full_name: string } | null
}

export default async function NuevoAlumnoPage({
  searchParams,
}: {
  searchParams: Promise<{
    requestId?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    username?: string
    birth_date?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: plans }, { data: settings }, { data: classesData }, { data: enrollments }] = await Promise.all([
    supabase.from('plans').select('id, name, price, classes_per_week').eq('active', true).order('price'),
    supabase.from('studio_settings').select('payment_due_day').single(),
    supabase
      .from('classes')
      .select(
        'id, day_of_week, start_time, end_time, capacity, pending_extra_capacity, room, instructor_id, class_types(name), profiles(full_name)'
      )
      .eq('active', true)
      .order('start_time'),
    supabase.from('enrollments').select('class_id').eq('status', 'active'),
  ])

  const dueDay = settings?.payment_due_day ?? 10
  const defaultEndDate = suggestNextDueDate(new Date(), dueDay)

  const countByClass = new Map<string, number>()
  for (const e of enrollments ?? []) countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)

  const classes = (classesData ?? []) as unknown as ClassRow[]
  const classOptions: ClassOption[] = DAY_ORDER.flatMap((day) =>
    classes
      .filter((c) => c.day_of_week === day)
      .map((c) => ({
        id: c.id,
        dayOfWeek: c.day_of_week,
        startTime: c.start_time,
        endTime: c.end_time,
        capacity: c.capacity,
        pendingExtraCapacity: c.pending_extra_capacity,
        room: c.room,
        typeName: c.class_types?.name ?? 'Clase',
        enrolled: countByClass.get(c.id) ?? 0,
        enrollmentId: null,
        instructorId: c.instructor_id,
        instructorName: c.profiles?.full_name ?? null,
      }))
  )

  return (
    <NewStudentForm
      plans={plans ?? []}
      classOptions={classOptions}
      defaultEndDate={defaultEndDate}
      requestId={params.requestId}
      defaultFirstName={params.first_name ?? ''}
      defaultLastName={params.last_name ?? ''}
      defaultEmail={params.email ?? ''}
      defaultPhone={params.phone ?? ''}
      defaultUsername={params.username ?? ''}
      defaultBirthDate={params.birth_date ?? ''}
    />
  )
}
