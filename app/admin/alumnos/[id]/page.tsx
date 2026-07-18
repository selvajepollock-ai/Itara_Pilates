import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditStudentForm } from './edit-student-form'
import { SetPasswordForm } from './set-password-form'
import { StudentScheduleForm } from './schedule-form'
import { DAY_ORDER } from '@/lib/day-names'

type ClassOption = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  room: string
  class_types: { name: string } | null
}

export default async function EditarAlumnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: student }, { data: classesData }, { data: myEnrollments }, { data: allEnrollments }] =
    await Promise.all([
      supabase.from('profiles').select('id, full_name, email, phone, birth_date').eq('id', id).single(),
      supabase
        .from('classes')
        .select('id, day_of_week, start_time, end_time, capacity, room, class_types(name)')
        .eq('active', true)
        .order('start_time'),
      supabase.from('enrollments').select('id, class_id').eq('student_id', id).eq('status', 'active'),
      supabase.from('enrollments').select('class_id').eq('status', 'active'),
    ])

  if (!student) notFound()

  const classes = (classesData ?? []) as unknown as ClassOption[]
  const enrollmentIdByClass = new Map((myEnrollments ?? []).map((e) => [e.class_id, e.id]))
  const countByClass = new Map<string, number>()
  for (const e of allEnrollments ?? []) {
    countByClass.set(e.class_id, (countByClass.get(e.class_id) ?? 0) + 1)
  }

  const classOptions = DAY_ORDER.flatMap((day) =>
    classes
      .filter((c) => c.day_of_week === day)
      .map((c) => ({
        id: c.id,
        dayOfWeek: c.day_of_week,
        startTime: c.start_time,
        endTime: c.end_time,
        capacity: c.capacity,
        room: c.room,
        typeName: c.class_types?.name ?? 'Clase',
        enrolled: countByClass.get(c.id) ?? 0,
        enrollmentId: enrollmentIdByClass.get(c.id) ?? null,
      }))
  )

  return (
    <div>
      <Link href="/admin/alumnos" className="text-sm text-moss hover:text-moss-dark">
        ← Volver a alumnos
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-moss">Alumnos</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">{student.full_name}</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <div className="max-w-md">
          <EditStudentForm student={student} />

          <h2 className="mt-10 text-xs uppercase tracking-[0.25em] text-moss">
            Restablecer contraseña
          </h2>
          <p className="mt-1 text-sm text-ink/50">
            Por si el alumno perdió el acceso. Le vas a tener que avisar la contraseña nueva.
          </p>
          <SetPasswordForm studentId={student.id} />
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-[0.25em] text-moss">Horario asignado</h2>
          <p className="mt-1 text-sm text-ink/50">
            Tildá las clases fijas de este alumno (lo que paga mes a mes). Se repiten todas las semanas.
          </p>
          <StudentScheduleForm studentId={student.id} classOptions={classOptions} />
        </div>
      </div>
    </div>
  )
}
