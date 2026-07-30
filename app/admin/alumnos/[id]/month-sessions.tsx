import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toISODate } from '@/lib/sessions'
import { MonthMoveCalendar } from './month-move-calendar'

export async function MonthSessions({
  studentId,
  monthOffset = 0,
}: {
  studentId: string
  monthOffset?: number
}) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const today = new Date()
  const targetMonth = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const monthStart = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
  const monthEnd = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)
  const monthLabel = targetMonth.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })

  const [
    { data: myEnrollments },
    { data: allClasses },
    { data: cancellations },
    { data: recoveries },
    { data: allEnrollmentsGlobal },
  ] = await Promise.all([
    supabase
      .from('enrollments')
      .select('id, class_id, classes(id, day_of_week, start_time, capacity, class_types(name))')
      .eq('student_id', studentId)
      .eq('status', 'active'),
    supabase
      .from('classes')
      .select('id, day_of_week, start_time, capacity, class_types(name)')
      .eq('active', true),
    supabase
      .from('session_cancellations')
      .select('enrollment_id, class_id, session_date')
      .eq('student_id', studentId)
      .gte('session_date', toISODate(monthStart))
      .lte('session_date', toISODate(monthEnd)),
    supabase
      .from('attendance')
      .select('id, class_id, session_date')
      .eq('student_id', studentId)
      .not('recovery_credit_id', 'is', null)
      .gte('session_date', toISODate(monthStart))
      .lte('session_date', toISODate(monthEnd)),
    admin.from('enrollments').select('class_id').eq('status', 'active'),
  ])

  type MyEnrollment = {
    id: string
    class_id: string
    classes: { id: string; day_of_week: number; start_time: string; capacity: number; class_types: { name: string } | null } | null
  }
  type ClassRow = {
    id: string
    day_of_week: number
    start_time: string
    capacity: number
    class_types: { name: string } | null
  }

  const myClassTypeNames = new Set(
    ((myEnrollments ?? []) as unknown as MyEnrollment[])
      .map((e) => e.classes?.class_types?.name)
      .filter(Boolean)
  )
  const classes = ((allClasses ?? []) as unknown as ClassRow[]).filter((c) =>
    myClassTypeNames.size === 0 ? true : myClassTypeNames.has(c.class_types?.name)
  )

  const enrolledCountByClass = new Map<string, number>()
  for (const e of allEnrollmentsGlobal ?? []) {
    enrolledCountByClass.set(e.class_id, (enrolledCountByClass.get(e.class_id) ?? 0) + 1)
  }

  const cancelledKeys = new Set(
    (cancellations ?? []).map((c) => `${c.class_id}_${c.session_date}`)
  )
  const recoveryByDateClass = new Map<string, string>() // "classId_date" -> attendance id
  for (const r of recoveries ?? []) {
    recoveryByDateClass.set(`${r.class_id}_${r.session_date}`, r.id)
  }

  const myEnrollmentByClassId = new Map(
    ((myEnrollments ?? []) as unknown as MyEnrollment[]).map((e) => [e.class_id, e.id])
  )

  const hours = Array.from(new Set(classes.map((c) => c.start_time))).sort()
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']

  // Semanas del mes (lunes a viernes)
  const firstWeekMonday = new Date(monthStart)
  const offsetToMonday = (firstWeekMonday.getDay() + 6) % 7
  firstWeekMonday.setDate(firstWeekMonday.getDate() - offsetToMonday)

  const weeks: { label: string; days: { date: string; dayOfWeek: number }[] }[] = []
  const cursor = new Date(firstWeekMonday)
  while (cursor <= monthEnd) {
    const days: { date: string; dayOfWeek: number }[] = []
    for (let i = 0; i < 5; i++) {
      days.push({ date: toISODate(cursor), dayOfWeek: cursor.getDay() })
      cursor.setDate(cursor.getDate() + 1)
    }
    cursor.setDate(cursor.getDate() + 2)
    const label = `${new Date(`${days[0].date}T00:00:00`).getDate()} al ${new Date(
      `${days[4].date}T00:00:00`
    ).getDate()}`
    weeks.push({ label, days })
  }

  // Armar la data completa de celdas para el cliente
  const weeksData = weeks.map((week) => ({
    label: week.label,
    days: week.days.map((d) => d.date),
    cells: hours.map((hour) => ({
      hour,
      row: week.days.map((d) => {
        const classForSlot = classes.find((c) => c.day_of_week === d.dayOfWeek && c.start_time === hour)
        if (!classForSlot) return null

        const key = `${classForSlot.id}_${d.date}`
        const isMyFixedSlot = myEnrollmentByClassId.has(classForSlot.id)
        const isCancelledThisDate = cancelledKeys.has(key)
        const recoveryId = recoveryByDateClass.get(key)
        const isScheduled = (isMyFixedSlot && !isCancelledThisDate) || Boolean(recoveryId)

        const enrolled = enrolledCountByClass.get(classForSlot.id) ?? 0
        const hasRoom = enrolled < classForSlot.capacity

        return {
          date: d.date,
          classId: classForSlot.id,
          enrollmentId: isMyFixedSlot ? myEnrollmentByClassId.get(classForSlot.id)! : null,
          typeName: classForSlot.class_types?.name ?? 'Clase',
          isScheduled,
          isMyFixedSlot,
          hasRoom: hasRoom || isScheduled,
        }
      }),
    })),
  }))

  const prevOffset = monthOffset - 1
  const nextOffset = monthOffset + 1

  return (
    <MonthMoveCalendar
      studentId={studentId}
      monthLabel={monthLabel}
      prevOffset={prevOffset}
      nextOffset={nextOffset}
      dayLabels={dayLabels}
      weeks={weeksData}
    />
  )
}
