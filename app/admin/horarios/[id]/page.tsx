import Link from 'next/link'
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { notFound } from 'next/navigation'
import { InfoHint } from '@/app/components/info-hint'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'
import { EnrollStudentForm } from './enroll-student-form'
import { RemoveEnrollmentButton } from './remove-enrollment-button'
import { getMonday, dateForDayOfWeek, toISODate } from '@/lib/sessions'
import { isNoAccessEmail } from '@/lib/auth-username'
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
      .select('student_id, profiles!attendance_student_id_fkey(full_name)')
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
  const cancelledNames = enrollments
    .filter((e) => cancelledEnrollmentIds.has(e.id))
    .map((e) => ({ id: e.id, name: e.profiles?.full_name ?? 'Alumno' }))
  const freedSpots = Math.max(cancelledNames.length - recovering.length, 0)
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

  const fixedFree = Math.max(classItem.capacity - enrollments.length, 0)
  const dayLabel = sessionDateObj.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })

  // Quiénes vienen ESE día: recuperan (resaltados), fijos, y los que avisaron que no.
  type DayRow = { key: string; studentId: string; name: string; kind: 'recupera' | 'fijo' | 'cancelo' }
  const dayRows: DayRow[] = [
    ...recovering.map((r): DayRow => ({ key: `r-${r.student_id}`, studentId: r.student_id, name: r.profiles?.full_name ?? 'Alumno', kind: 'recupera' })),
    ...enrollments
      .filter((e) => !cancelledEnrollmentIds.has(e.id))
      .map((e): DayRow => ({ key: `f-${e.id}`, studentId: e.student_id, name: e.profiles?.full_name ?? 'Alumno', kind: 'fijo' })),
    ...enrollments
      .filter((e) => cancelledEnrollmentIds.has(e.id))
      .map((e): DayRow => ({ key: `c-${e.id}`, studentId: e.student_id, name: e.profiles?.full_name ?? 'Alumno', kind: 'cancelo' })),
  ]

  const stats: { label: string; value: string; tone: string; hint: string }[] = [
    { label: 'Vienen ese día', value: `${attendingCount}/${classItem.capacity}`, tone: attendingCount > classItem.capacity ? 'text-clay' : 'text-ink', hint: 'fijos + recuperan − cancelaron' },
    { label: 'Lugares fijos libres', value: String(fixedFree), tone: fixedFree === 0 ? 'text-clay' : 'text-moss-dark', hint: 'para anotar de forma permanente' },
    { label: 'Liberados', value: `+${freedSpots}`, tone: 'text-amber-600', hint: 'por cancelación, solo para recuperar' },
    { label: 'Cancelaron', value: String(cancelledNames.length), tone: 'text-ink', hint: 'esa fecha' },
    { label: 'Recuperan', value: String(recovering.length), tone: 'text-sky-600', hint: 'vienen a recuperar' },
  ]

  return (
    <div className="max-w-6xl">
      <Link href={`/admin/horarios${weekQS}`} className="text-sm text-moss hover:text-moss-dark">
        ← Volver a horarios
      </Link>

      {/* Encabezado: qué clase es + acciones + moverse entre clases */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h1 className="font-display text-3xl italic text-ink">{classItem.class_types?.name}</h1>
            <span className="text-sm text-ink/50">
              {DAY_NAMES[classItem.day_of_week]} · {formatTime(classItem.start_time)}–{formatTime(classItem.end_time)}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink/60">
            {classItem.room} · Prof. {classItem.profiles?.full_name ?? 'sin asignar'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {prevClass ? (
            <Link href={`/admin/horarios/${prevClass.id}${weekQS}`} className="btn-secondary-sm" title={neighbourLabel(prevClass)}>
              <ChevronLeft size={14} />
              Clase anterior
            </Link>
          ) : null}
          {nextClass ? (
            <Link href={`/admin/horarios/${nextClass.id}${weekQS}`} className="btn-secondary-sm" title={neighbourLabel(nextClass)}>
              Clase siguiente
              <ChevronRight size={14} />
            </Link>
          ) : null}
          <Link href={`/instructor/clases/${classItem.id}`} className="btn-secondary-sm">
            Agenda y asistencia
          </Link>
        </div>
      </div>

      {classItem.pending_extra_capacity > 0 && (
        <ActivateExtraCapacityButton
          classId={classItem.id}
          pendingExtraCapacity={classItem.pending_extra_capacity}
        />
      )}

      {/* Fecha que se está mirando + indicadores del día, todos en una misma línea */}
      <div className="mt-6 rounded-2xl border border-sand bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link href={`/admin/horarios/${id}?week=${toISODate(prevWeek)}`} className="icon-btn-sm" aria-label="Semana anterior">
              <ChevronLeft size={15} />
            </Link>
            <p className="font-display text-xl italic text-ink first-letter:uppercase">{dayLabel}</p>
            <Link href={`/admin/horarios/${id}?week=${toISODate(nextWeek)}`} className="icon-btn-sm" aria-label="Semana siguiente">
              <ChevronRight size={15} />
            </Link>
          </div>
          <p className="text-xs text-ink/40">Los números de abajo son de esta fecha, salvo el cupo fijo.</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl border border-sand/70 bg-linen/40 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink/45">{s.label}</p>
              <p className={`mt-1 font-display text-2xl italic ${s.tone}`}>{s.value}</p>
              <p className="mt-0.5 text-[11px] text-ink/40">{s.hint}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dos tarjetas parejas: administrar el horario fijo | ver y gestionar la fecha */}
      <div className="mt-6 grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-sand bg-white p-5">
          <h2 className="section-title flex items-center gap-1.5">
            Horario fijo
            <InfoHint text={'Los alumnos que vienen todas las semanas a esta clase. "Sacar del horario fijo" los quita de todas las semanas. Para una falta de un día puntual, usá la tarjeta "Esta fecha".'} />
          </h2>
          <p className="mt-0.5 text-xs text-ink/50">
            {enrollments.length} de {classItem.capacity} lugares · {fixedFree} libre{fixedFree === 1 ? '' : 's'}
          </p>

          <ul className="mt-4 divide-y divide-sand/60 rounded-xl border border-sand/70">
            {enrollments.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <Link
                  href={`/admin/alumnos/${e.student_id}?back=${encodeURIComponent(backToClass)}`}
                  className="group min-w-0 flex-1"
                >
                  <p className="truncate text-sm text-ink group-hover:text-moss group-hover:underline">
                    {e.profiles?.full_name}
                    {cancelledEnrollmentIds.has(e.id) && (
                      <span className="ml-2 rounded-full bg-clay/10 px-2 py-0.5 text-[11px] font-medium text-clay">
                        Canceló esta fecha
                      </span>
                    )}
                  </p>
                  {e.profiles?.email && !isNoAccessEmail(e.profiles.email) && (
                    <p className="truncate text-xs text-ink/45">{e.profiles.email}</p>
                  )}
                </Link>
                <RemoveEnrollmentButton
                  enrollmentId={e.id}
                  classId={classItem.id}
                  studentName={e.profiles?.full_name}
                />
              </li>
            ))}
            {enrollments.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink/40">
                Todavía no hay alumnos con horario fijo en esta clase.
              </li>
            )}
          </ul>

          <div className="mt-5 border-t border-sand pt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Anotar alumno en el horario fijo</p>
            <div className="mt-2">
              <EnrollStudentForm classId={classItem.id} students={availableStudents} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-sand bg-white p-5">
          <h2 className="section-title">Esta fecha</h2>
          <p className="mt-0.5 text-xs text-ink/50 first-letter:uppercase">{dayLabel} · quiénes vienen ese día</p>

          <ul className="mt-4 divide-y divide-sand/60 rounded-xl border border-sand/70">
            {dayRows.map((r) => (
              <li
                key={r.key}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 ${r.kind === 'recupera' ? 'bg-sky-50' : ''}`}
              >
                <Link
                  href={`/admin/alumnos/${r.studentId}?back=${encodeURIComponent(backToClass)}`}
                  className={`min-w-0 flex-1 truncate text-sm hover:text-moss hover:underline ${
                    r.kind === 'cancelo' ? 'text-ink/40 line-through' : 'text-ink'
                  }`}
                >
                  {r.name}
                </Link>
                {r.kind === 'recupera' && (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-sky-500 px-2.5 py-0.5 text-[11px] font-semibold text-white">
                    <RotateCcw size={10} strokeWidth={3} />
                    Recupera
                  </span>
                )}
                {r.kind === 'fijo' && <span className="shrink-0 text-[11px] text-ink/40">Fijo</span>}
                {r.kind === 'cancelo' && (
                  <span className="shrink-0 rounded-full bg-clay/10 px-2.5 py-0.5 text-[11px] font-medium text-clay">
                    Canceló
                  </span>
                )}
              </li>
            ))}
            {dayRows.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink/40">No hay nadie anotado para esta fecha.</li>
            )}
          </ul>

          {freedSpots > 0 && (
            <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-ink/70">
              <span className="rounded-full bg-amber-300 px-2 py-0.5 font-bold text-ink">+{freedSpots}</span>
              lugar{freedSpots === 1 ? '' : 'es'} liberado{freedSpots === 1 ? '' : 's'} por cancelación: sirve para
              recuperar, no para anotar fijo.
            </p>
          )}

          <CancelOccurrenceForm
            key={sessionDate}
            classId={classItem.id}
            cancelledDates={cancelledData ?? []}
            defaultDate={sessionDate}
          />
        </section>
      </div>
    </div>
  )
}
