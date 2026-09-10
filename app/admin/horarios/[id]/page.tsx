import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'
import { EnrollStudentForm } from './enroll-student-form'
import { RemoveEnrollmentButton } from './remove-enrollment-button'
import { CancelOccurrenceForm } from './cancel-occurrence-form'

type ClassDetail = {
  id: string
  room: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  class_types: { name: string } | null
  profiles: { full_name: string } | null
}

type EnrollmentRow = {
  id: string
  student_id: string
  profiles: { full_name: string; email: string } | null
}

type NeighbourClass = {
  id: string
  day_of_week: number
  start_time: string
  class_types: { name: string } | null
}

export default async function ClaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string }>
}) {
  const { id } = await params
  const { week } = await searchParams
  const weekQS = week ? `?week=${week}` : ''
  const supabase = await createClient()

  const todayISO = new Date().toISOString().slice(0, 10)

  const [
    { data: classData },
    { data: enrollmentsData },
    { data: studentsData },
    { data: allClassesData },
    { data: cancelledData },
  ] = await Promise.all([
      supabase
        .from('classes')
        .select(
          'id, room, day_of_week, start_time, end_time, capacity, class_types(name), profiles(full_name)'
        )
        .eq('id', id)
        .single(),
      supabase
        .from('enrollments')
        .select('id, student_id, profiles(full_name, email)')
        .eq('class_id', id)
        .eq('status', 'active'),
      supabase.from('profiles').select('id, full_name').contains('roles', ['student']).order('full_name'),
      supabase
        .from('classes')
        .select('id, day_of_week, start_time, class_types(name)')
        .eq('active', true),
      supabase
        .from('class_cancellations')
        .select('session_date, reason')
        .eq('class_id', id)
        .gte('session_date', todayISO)
        .order('session_date'),
    ])

  if (!classData) notFound()

  const classItem = classData as unknown as ClassDetail
  const enrollments = (enrollmentsData ?? []) as unknown as EnrollmentRow[]
  const allStudents = (studentsData ?? []) as { id: string; full_name: string }[]

  const enrolledIds = new Set(enrollments.map((e) => e.student_id))
  const availableStudents = allStudents.filter((s) => !enrolledIds.has(s.id))

  // Clases ordenadas como en la grilla (por día de la semana, después por hora)
  // para poder saltar a la anterior / siguiente sin volver al horario.
  const ordered = ((allClassesData ?? []) as unknown as NeighbourClass[])
    .slice()
    .sort((a, b) => {
      const dayDiff = DAY_ORDER.indexOf(a.day_of_week) - DAY_ORDER.indexOf(b.day_of_week)
      return dayDiff !== 0 ? dayDiff : a.start_time.localeCompare(b.start_time)
    })
  const currentIdx = ordered.findIndex((c) => c.id === id)
  const prevClass = currentIdx > 0 ? ordered[currentIdx - 1] : null
  const nextClass = currentIdx >= 0 && currentIdx < ordered.length - 1 ? ordered[currentIdx + 1] : null
  const neighbourLabel = (c: NeighbourClass) =>
    `${c.class_types?.name ?? 'Clase'} · ${DAY_NAMES[c.day_of_week]} ${formatTime(c.start_time)}`

  const backToClass = `/admin/horarios/${id}${weekQS}`

  return (
    <div className="max-w-xl">
      <Link href={`/admin/horarios${weekQS}`} className="text-sm text-moss hover:text-moss-dark">
        ← Volver a horarios
      </Link>

      <div className="mt-4 flex items-baseline gap-3">
        <h1 className="font-display text-3xl italic text-ink">{classItem.class_types?.name}</h1>
        <span className="text-sm text-ink/50">
          {DAY_NAMES[classItem.day_of_week]} · {formatTime(classItem.start_time)}–
          {formatTime(classItem.end_time)}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-sand bg-white px-2 py-1.5">
        {prevClass ? (
          <Link
            href={`/admin/horarios/${prevClass.id}${weekQS}`}
            className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink/60 transition hover:bg-linen hover:text-moss"
          >
            <ChevronLeft size={14} className="shrink-0" />
            <span className="truncate">{neighbourLabel(prevClass)}</span>
          </Link>
        ) : (
          <span className="px-2 py-1 text-xs text-ink/25">— sin anterior</span>
        )}
        {nextClass ? (
          <Link
            href={`/admin/horarios/${nextClass.id}${weekQS}`}
            className="flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-ink/60 transition hover:bg-linen hover:text-moss"
          >
            <span className="truncate">{neighbourLabel(nextClass)}</span>
            <ChevronRight size={14} className="shrink-0" />
          </Link>
        ) : (
          <span className="px-2 py-1 text-xs text-ink/25">sin siguiente —</span>
        )}
      </div>
      <p className="mt-1 text-sm text-ink/60">
        {classItem.room} · {classItem.profiles?.full_name ?? 'Sin instructor'} · cupo{' '}
        {enrollments.length}/{classItem.capacity}
      </p>

      <Link
        href={`/instructor/clases/${classItem.id}`}
        className="mt-4 inline-block text-sm text-moss hover:text-moss-dark"
      >
        Ver agenda y asistencia →
      </Link>

      <h2 className="mt-8 text-xs uppercase tracking-[0.25em] text-moss">Alumnos anotados</h2>
      <ul className="mt-3 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
        {enrollments.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-5 py-3">
            <Link
              href={`/admin/alumnos/${e.student_id}?back=${encodeURIComponent(backToClass)}`}
              className="group -my-1 flex-1 rounded-lg py-1 transition hover:bg-linen/60"
            >
              <p className="text-sm text-ink group-hover:text-moss group-hover:underline">
                {e.profiles?.full_name}
              </p>
              <p className="text-xs text-ink/50">{e.profiles?.email}</p>
            </Link>
            <RemoveEnrollmentButton enrollmentId={e.id} classId={classItem.id} />
          </li>
        ))}
        {enrollments.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-ink/40">
            Todavía no hay alumnos anotados a esta clase.
          </li>
        )}
      </ul>

      <h2 className="mt-8 text-xs uppercase tracking-[0.25em] text-moss">Anotar alumno</h2>
      <EnrollStudentForm classId={classItem.id} students={availableStudents} />

      <CancelOccurrenceForm classId={classItem.id} cancelledDates={cancelledData ?? []} />
    </div>
  )
}
