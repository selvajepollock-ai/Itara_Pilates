import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditStudentForm } from './edit-student-form'
import { SetPasswordForm } from './set-password-form'
import { StudentScheduleForm } from './schedule-form'
import { StudentBilling } from './student-billing'
import { MonthSessions } from './month-sessions'
import { PlanEditorToggle } from './plan-editor-toggle'
import { GrantAccessForm } from './grant-access-form'
import { DeleteStudentButton } from './delete-student-button'
import { ToggleStudentActiveButton } from './toggle-active-button'
import { isNoAccessEmail } from '@/lib/auth-username'
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

export default async function EditarAlumnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ month?: string }>
}) {
  const { id } = await params
  const { month } = await searchParams
  const monthOffset = month ? parseInt(month, 10) || 0 : 0
  const supabase = await createClient()

  const [{ data: student }, { data: classesData }, { data: myEnrollments }, { data: allEnrollments }] =
    await Promise.all([
      supabase.from('profiles').select('id, full_name, email, phone, birth_date, health_notes, contact_email, active').eq('id', id).single(),
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

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Alumnos</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">{student.full_name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <ToggleStudentActiveButton studentId={student.id} active={student.active} />
          <DeleteStudentButton studentId={student.id} fullName={student.full_name} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
        <div className="max-w-md space-y-6">
          <EditStudentForm student={student} />

          {isNoAccessEmail(student.email) && (
            <div className="rounded-2xl border border-clay/30 bg-clay/5 p-6">
              <p className="text-sm font-medium text-ink">Sin acceso a la app todavía</p>
              <p className="mt-0.5 text-xs text-ink/50">
                Cargá su email real para darle acceso — le va a llegar un mail para crear su contraseña.
              </p>
              <GrantAccessForm studentId={student.id} defaultEmail={student.contact_email ?? ''} />
            </div>
          )}

          <StudentBilling studentId={student.id} />

          <div>
            <h2 className="text-xs uppercase tracking-[0.25em] text-moss">
              Restablecer contraseña
            </h2>
            <p className="mt-1 text-sm text-ink/50">
              Por si el alumno perdió el acceso. Le vas a tener que avisar la contraseña nueva.
            </p>
            <SetPasswordForm studentId={student.id} />
          </div>
        </div>

        <div>
          <MonthSessions studentId={student.id} monthOffset={monthOffset} />

          <PlanEditorToggle>
            <p className="mb-2 text-xs text-ink/50">
              Esto cambia el plan de base — afecta todas las semanas futuras, no solo una fecha puntual.
            </p>
            <StudentScheduleForm studentId={student.id} classOptions={classOptions} />
          </PlanEditorToggle>
        </div>
      </div>
    </div>
  )
}
