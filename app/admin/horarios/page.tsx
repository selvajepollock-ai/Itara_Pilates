import { createClient } from '@/lib/supabase/server'
import { loadStudentRows } from '@/lib/student-rows'
import { HorariosView } from './horarios-view'
import { addDaysISO, mondayOf, todayART } from './slots'
import type { ClassItem, OccurrenceData, Recovering } from './types'

type ClassRow = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  pending_extra_capacity: number
  instructor_id: string | null
  class_types: { name: string } | null
  profiles: { full_name: string } | null
}

type EnrollmentRow = {
  id: string
  class_id: string
  student_id: string
  profiles: { full_name: string } | null
}

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: me } = user
    ? await supabase.from('profiles').select('roles').eq('id', user.id).maybeSingle()
    : { data: null }
  // El horario fijo es solo para el rol administrador (el layout ya exige admin; esto lo asegura en el servidor).
  const isAdmin = Boolean(me?.roles?.includes('admin'))

  const today = todayART()
  const monday = mondayOf(week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? week : today)
  const sunday = addDaysISO(monday, 6)

  const [
    { data: classesData },
    { data: enrollmentsData },
    { data: holidaysData },
    { data: weekCancellations },
    { data: weekRecoveries },
    { data: wholeCancellations },
    { rows: studentRows, dueDay },
  ] = await Promise.all([
    supabase
      .from('classes')
      .select(
        'id, day_of_week, start_time, end_time, capacity, pending_extra_capacity, instructor_id, class_types(name), profiles(full_name)'
      )
      .eq('active', true),
    supabase.from('enrollments').select('id, class_id, student_id, profiles(full_name)').eq('status', 'active'),
    supabase.from('holidays').select('date, label').gte('date', monday).lte('date', sunday),
    supabase
      .from('session_cancellations')
      .select('class_id, session_date, enrollment_id')
      .gte('session_date', monday)
      .lte('session_date', sunday),
    supabase
      .from('attendance')
      .select('class_id, session_date, student_id, profiles!attendance_student_id_fkey(full_name)')
      .not('recovery_credit_id', 'is', null)
      .gte('session_date', monday)
      .lte('session_date', sunday),
    supabase
      .from('class_cancellations')
      .select('class_id, session_date')
      .gte('session_date', monday)
      .lte('session_date', sunday),
    loadStudentRows(supabase),
  ])

  const fixedByClass = new Map<string, ClassItem['fixed']>()
  for (const e of (enrollmentsData ?? []) as unknown as EnrollmentRow[]) {
    const list = fixedByClass.get(e.class_id) ?? []
    list.push({ enrollmentId: e.id, studentId: e.student_id, name: e.profiles?.full_name ?? 'Alumno' })
    fixedByClass.set(e.class_id, list)
  }

  const classes: ClassItem[] = ((classesData ?? []) as unknown as ClassRow[]).map((c) => ({
    id: c.id,
    dow: c.day_of_week,
    start: c.start_time.slice(0, 5),
    end: c.end_time.slice(0, 5),
    capacity: c.capacity,
    typeName: c.class_types?.name ?? 'Clase',
    instructorName: c.profiles?.full_name ?? null,
    fixed: (fixedByClass.get(c.id) ?? []).sort((a, b) => a.name.localeCompare(b.name, 'es')),
  }))

  const occurrences: OccurrenceData = { cancelled: {}, recovering: {}, wholeCancelled: [] }
  for (const c of weekCancellations ?? []) {
    const k = `${c.class_id}|${c.session_date}`
    ;(occurrences.cancelled[k] ??= []).push(c.enrollment_id as string)
  }
  for (const r of (weekRecoveries ?? []) as unknown as {
    class_id: string
    session_date: string
    student_id: string
    profiles: { full_name: string } | null
  }[]) {
    const k = `${r.class_id}|${r.session_date}`
    const item: Recovering = { studentId: r.student_id, name: r.profiles?.full_name ?? 'Alumno' }
    ;(occurrences.recovering[k] ??= []).push(item)
  }
  occurrences.wholeCancelled = (wholeCancellations ?? []).map((c) => `${c.class_id}|${c.session_date}`)

  const holidays = Object.fromEntries((holidaysData ?? []).map((h) => [h.date, h.label as string]))
  const pendingExtraCapacityCount = ((classesData ?? []) as unknown as ClassRow[]).filter(
    (c) => c.pending_extra_capacity > 0
  ).length

  return (
    <HorariosView
      monday={monday}
      today={today}
      isAdmin={isAdmin}
      classes={classes}
      occurrences={occurrences}
      holidays={holidays}
      students={studentRows}
      dueDay={dueDay}
      pendingExtraCapacityCount={pendingExtraCapacityCount}
    />
  )
}
