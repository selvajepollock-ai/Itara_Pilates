import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import { InfoHint } from '@/app/components/info-hint'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'
import { EnrollStudentForm } from './enroll-student-form'
import { RemoveEnrollmentButton } from './remove-enrollment-button'
import { getMonday, dateForDayOfWeek, toISODate } from '@/lib/sessions'
import { CancelOccurrenceForm } from './cancel-occurrence-form'
import { ActivateExtraCapacityButton } from './activate-extra-capacity-button'

type ClassDetail = {
  id: string
  room: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  pending_extra_capacity: number
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
          'id, room, day_of_week, start_time, end_time, capacity, pending_extra_capacity, class_types(name), profiles(full_name)'
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

  // La fecha concreta que se está mirando: la de esta clase en la semana elegida.
  const baseMonday = week ? getMonday(new Date(week)) : getMonday(new Date())
  const sessionDateObj = dateForDayOfWeek(baseMonday, classItem.day_of_week)
  const sessionDate = toISODate(sessionDateObj)
  const prevWeek = new Date(baseMonday)
  prevWeek.setDate(prevWeek.getDate() - 7)
  const nextWeek = new Date(baseMonday)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const [{ data: sessionCancellations }, { data: recoveringRows }] = await Promise.all([
    supabase
      .from('session_cancellations')
      .select('enrollment_id')
      .eq('class_id', id)
      .eq('session_date', sessionDate),
    supabase
      .from('attendance')
      .select('student_id, profiles(full_name)')
      .eq('class_id', id)
      .eq('session_date', sessionDate)
      .not('recovery_credit_id', 'is', null),
  ])
  const cancelledEnrollmentIds = new Set((sessionCancellations ?? []).map((c) => c.enrollment_id))
  const recovering = (recoveringRows ?? []) as unknown as {
    student_id: string
    profiles: { full_name: string } | null
  }[]
  const attendingCount = enrollments.length - cancelledEnrollmentIds.size + recovering.length
  const allStudents = (studentsData ?? []) as { id: string; full_name: string }[]

  const enrolledIds = new Set(enrollments.map((e) => e.student_id))
  const availableStudents = allStudents.filter((s) => !enrolledIds.has(s.id))

  // Clases ordenadas como en la grilla (por día de la semana, después por hora)
  // para poder saltar a la anterior / siguiente sin volver al horario.
  // Se saltean las de "Fuerza": anterior/siguiente recorre solo Reformer.
  const ordered = ((allClassesData ?? []) as unknown as NeighbourClass[])
    .filter((c) => !c.class_types?.name?.toLowerCase().includes('fuerza'))
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
        {attendingCount}/{classItem.capacity}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <Link href={`/admin/horarios/${id}?week=${toISODate(prevWeek)}`} className="icon-btn-sm">
          <ChevronLeft size={15} />
        </Link>
        <span className="text-sm text-ink/60">
          Viendo el {sessionDateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <Link href={`/admin/horarios/${id}?week=${toISODate(nextWeek)}`} className="icon-btn-sm">
          <ChevronRight size={15} />
        </Link>
      </div>

      {classItem.pending_extra_capacity > 0 && (
        <ActivateExtraCapacityButton
          classId={classItem.id}
          pendingExtraCapacity={classItem.pending_extra_capacity}
        />
      )}

      <Link
        href={`/instructor/clases/${classItem.id}`}
        className="mt-4 inline-block text-sm text-moss hover:text-moss-dark"
      >
        Ver agenda y asistencia →
      </Link>

      <h2 className="mt-8 section-title flex items-center gap-1.5">
        Alumnos anotados
        <InfoHint text={'"Sacar del horario fijo" quita al alumno de esta clase en todas las semanas. Para una falta de un día puntual, entrá a la ficha del alumno y cancelá esa fecha.'} />
      </h2>
      <ul className="mt-3 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
        {enrollments.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-5 py-3">
            <Link
              href={`/admin/alumnos/${e.student_id}?back=${encodeURIComponent(backToClass)}`}
              className="group -my-1 flex-1 rounded-lg py-1 transition hover:bg-linen/60"
            >
              <p className="text-sm text-ink group-hover:text-moss group-hover:underline">
                {e.profiles?.full_name}
                {cancelledEnrollmentIds.has(e.id) && (
                  <span className="ml-2 rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-medium text-clay">
                    Canceló esta fecha
                  </span>
                )}
              </p>
              <p className="text-xs text-ink/50">{e.profiles?.email}</p>
            </Link>
            <RemoveEnrollmentButton
              enrollmentId={e.id}
              classId={classItem.id}
              studentName={e.profiles?.full_name}
            />
          </li>
        ))}
        {recovering.map((r) => (
          <li key={`rec-${r.student_id}`} className="flex items-center justify-between px-5 py-3">
            <Link
              href={`/admin/alumnos/${r.student_id}?back=${encodeURIComponent(backToClass)}`}
              className="group -my-1 flex-1 rounded-lg py-1 transition hover:bg-linen/60"
            >
              <p className="text-sm text-ink group-hover:text-moss group-hover:underline">
                {r.profiles?.full_name}
                <span className="ml-2 rounded-full bg-moss/10 px-2 py-0.5 text-[11px] font-medium text-moss-dark">
                  Recupera esta fecha
                </span>
              </p>
            </Link>
          </li>
        ))}
        {enrollments.length === 0 && recovering.length === 0 && (
          <li className="px-5 py-8 text-center text-sm text-ink/40">
            Todavía no hay alumnos anotados a esta clase.
          </li>
        )}
      </ul>

      <h2 className="mt-8 section-title">Anotar alumno</h2>
      <EnrollStudentForm classId={classItem.id} students={availableStudents} />

      <CancelOccurrenceForm classId={classItem.id} cancelledDates={cancelledData ?? []} />
    </div>
  )
}
