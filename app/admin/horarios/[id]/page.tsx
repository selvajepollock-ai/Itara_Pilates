import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'
import { EnrollStudentForm } from './enroll-student-form'
import { RemoveEnrollmentButton } from './remove-enrollment-button'

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

export default async function ClaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: classData }, { data: enrollmentsData }, { data: studentsData }] =
    await Promise.all([
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
    ])

  if (!classData) notFound()

  const classItem = classData as unknown as ClassDetail
  const enrollments = (enrollmentsData ?? []) as unknown as EnrollmentRow[]
  const allStudents = (studentsData ?? []) as { id: string; full_name: string }[]

  const enrolledIds = new Set(enrollments.map((e) => e.student_id))
  const availableStudents = allStudents.filter((s) => !enrolledIds.has(s.id))

  return (
    <div className="max-w-xl">
      <Link href="/admin/horarios" className="text-sm text-moss hover:text-moss-dark">
        ← Volver a horarios
      </Link>

      <div className="mt-4 flex items-baseline gap-3">
        <h1 className="font-display text-3xl italic text-ink">{classItem.class_types?.name}</h1>
        <span className="text-sm text-ink/50">
          {DAY_NAMES[classItem.day_of_week]} · {formatTime(classItem.start_time)}–
          {formatTime(classItem.end_time)}
        </span>
      </div>
      <p className="mt-1 text-sm text-ink/60">
        {classItem.room} · {classItem.profiles?.full_name ?? 'Sin instructor'} · cupo{' '}
        {enrollments.length}/{classItem.capacity}
      </p>

      <h2 className="mt-8 text-xs uppercase tracking-[0.25em] text-moss">Alumnos anotados</h2>
      <ul className="mt-3 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
        {enrollments.map((e) => (
          <li key={e.id} className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-sm text-ink">{e.profiles?.full_name}</p>
              <p className="text-xs text-ink/50">{e.profiles?.email}</p>
            </div>
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
    </div>
  )
}
