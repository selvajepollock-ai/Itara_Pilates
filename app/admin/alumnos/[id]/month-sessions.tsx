import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { toISODate } from '@/lib/sessions'
import { MonthMoveCalendar } from './month-move-calendar'

export async function MonthSessions({
  studentId,
  weekOffset = 0,
}: {
  studentId: string
  weekOffset?: number
}) {
  const supabase = await createClient()
  const admin = createAdminClient()

  const today = new Date()
  const baseMonday = new Date(today)
  const toMonday = (baseMonday.getDay() + 6) % 7
  baseMonday.setDate(baseMonday.getDate() - toMonday)
  const monday = new Date(baseMonday)
  monday.setDate(monday.getDate() + weekOffset * 7)

  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return toISODate(d)
  })
  const weekStart = weekDates[0]
  const weekEnd = weekDates[4]
  const weekLabel = `${new Date(`${weekStart}T00:00:00`).toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'short',
  })} – ${new Date(`${weekEnd}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}`

  const [
    { data: myEnrollments },
    { data: allClasses },
    { data: cancellations },
    { data: recoveries },
    { data: allEnrollmentsGlobal },
    { data: settings },
    { data: subscription },
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
      .gte('session_date', weekStart)
      .lte('session_date', weekEnd),
    supabase
      .from('attendance')
      .select('id, class_id, session_date')
      .eq('student_id', studentId)
      .not('recovery_credit_id', 'is', null)
      .gte('session_date', weekStart)
      .lte('session_date', weekEnd),
    admin.from('enrollments').select('class_id').eq('status', 'active'),
    supabase
      .from('studio_settings')
      .select('drop_in_class_price, drop_in_price_1, drop_in_price_2, drop_in_price_3, drop_in_price_4_plus')
      .maybeSingle(),
    supabase
      .from('subscriptions')
      .select('plans(price, classes_per_week)')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle(),
  ])

  const plan = subscription?.plans as unknown as { price: number; classes_per_week: number | null } | null
  const hasPlan = Boolean(plan?.classes_per_week && plan.classes_per_week > 0)
  const dropInPrice = hasPlan
    ? Math.round((plan!.price / (plan!.classes_per_week! * 4)) * 100) / 100
    : 0

  const tierPrices = {
    1: settings?.drop_in_price_1 ?? 10000,
    2: settings?.drop_in_price_2 ?? 9000,
    3: settings?.drop_in_price_3 ?? 8000,
    4: settings?.drop_in_price_4_plus ?? 7000,
  }

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

  const cancelledKeys = new Set((cancellations ?? []).map((c) => `${c.class_id}_${c.session_date}`))
  const recoveryByDateClass = new Map<string, string>()
  for (const r of recoveries ?? []) {
    recoveryByDateClass.set(`${r.class_id}_${r.session_date}`, r.id)
  }

  const myEnrollmentByClassId = new Map(
    ((myEnrollments ?? []) as unknown as MyEnrollment[]).map((e) => [e.class_id, e.id])
  )

  const hours = Array.from(new Set(classes.map((c) => c.start_time))).sort()
  const dayLabels = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie']
  const dayOfWeekByIndex = weekDates.map((d) => new Date(`${d}T00:00:00`).getDay())

  const cells = hours.map((hour) => ({
    hour,
    row: weekDates.map((date, i) => {
      const dow = dayOfWeekByIndex[i]
      const classForSlot = classes.find((c) => c.day_of_week === dow && c.start_time === hour)
      if (!classForSlot) return null

      const key = `${classForSlot.id}_${date}`
      const isMyFixedSlot = myEnrollmentByClassId.has(classForSlot.id)
      const isCancelledThisDate = cancelledKeys.has(key)
      const recoveryId = recoveryByDateClass.get(key)
      const isScheduled = (isMyFixedSlot && !isCancelledThisDate) || Boolean(recoveryId)

      const enrolled = enrolledCountByClass.get(classForSlot.id) ?? 0
      const hasRoom = enrolled < classForSlot.capacity

      return {
        date,
        classId: classForSlot.id,
        enrollmentId: isMyFixedSlot ? myEnrollmentByClassId.get(classForSlot.id)! : null,
        typeName: classForSlot.class_types?.name ?? 'Clase',
        isScheduled,
        isMyFixedSlot,
        hasRoom: hasRoom || isScheduled,
      }
    }),
  }))

  const prevOffset = weekOffset - 1
  const nextOffset = weekOffset + 1

  return (
    <MonthMoveCalendar
      studentId={studentId}
      weekLabel={weekLabel}
      prevOffset={prevOffset}
      nextOffset={nextOffset}
      dayLabels={dayLabels}
      cells={cells}
      dropInPrice={dropInPrice}
      hasPlan={hasPlan}
      tierPrices={tierPrices}
    />
  )
}
