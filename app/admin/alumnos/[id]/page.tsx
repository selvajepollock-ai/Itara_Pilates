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
import { ExtraChargesSection } from './extra-charges-section'
import { DeleteStudentButton } from './delete-student-button'
import { ToggleStudentActiveButton } from './toggle-active-button'
import { isNoAccessEmail } from '@/lib/auth-username'
import { DAY_ORDER } from '@/lib/day-names'
import { InfoHint } from '@/app/components/info-hint'

type ClassOption = {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  pending_extra_capacity: number
  room: string
  class_types: { name: string } | null
}

export default async function EditarAlumnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ week?: string; back?: string }>
}) {
  const { id } = await params
  const { week, back } = await searchParams
  // Volver a donde vino (p.ej. la ficha de una clase), si es una ruta interna.
  const backHref = back && back.startsWith('/admin/') ? back : '/admin/alumnos'
  const backLabel = backHref.startsWith('/admin/alumnos') ? '← Volver a alumnos' : '← Volver'
  const weekOffset = week ? parseInt(week, 10) || 0 : 0
  const supabase = await createClient()

  const [{ data: student }, { data: classesData }, { data: myEnrollments }, { data: allEnrollments }] =
    await Promise.all([
      supabase.from('profiles').select('id, full_name, nickname, email, phone, birth_date, health_notes, contact_email, active').eq('id', id).single(),
      supabase
        .from('classes')
        .select('id, day_of_week, start_time, end_time, capacity, pending_extra_capacity, room, class_types(name)')
        .eq('active', true)
        .order('start_time'),
      supabase.from('enrollments').select('id, class_id').eq('student_id', id).eq('status', 'active'),
      supabase.from('enrollments').select('class_id').eq('status', 'active'),
    ])

  if (!student) notFound()

  const hasAccess = !isNoAccessEmail(student.email)

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
        pendingExtraCapacity: c.pending_extra_capacity,
        room: c.room,
        typeName: c.class_types?.name ?? 'Clase',
        enrolled: countByClass.get(c.id) ?? 0,
        enrollmentId: enrollmentIdByClass.get(c.id) ?? null,
      }))
  )

  return (
    <div>
      <Link href={backHref} className="text-sm text-moss hover:text-moss-dark">
        {backLabel}
      </Link>

      <div className="mt-4 flex items-center justify-between">
        <div>
          <p className="eyebrow">Alumnos</p>
          <h1 className="page-title mt-2">{student.full_name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <ToggleStudentActiveButton studentId={student.id} active={student.active} />
          <DeleteStudentButton studentId={student.id} fullName={student.full_name} />
        </div>
      </div>

      {/* Datos personales + acceso a la app: mismo recuadro, porque son la misma
          "identidad" del alumno -- una división interna en vez de tarjetas
          sueltas repartidas por la pantalla. */}
      <div className="mt-6 grid gap-6 rounded-2xl border border-sand bg-white p-6 lg:grid-cols-2 lg:divide-x lg:divide-sand">
        <EditStudentForm student={student} />

        <div className="lg:pl-6">
          <div className="flex items-center justify-between">
            <h2 className="section-title flex items-center gap-1.5">
              Acceso a la app
              <InfoHint
                align="left"
                text={
                  hasAccess
                    ? 'El alumno ya puede entrar a la app con su email y contraseña. Si la olvidó, le podés poner una nueva acá.'
                    : 'Todavía no puede entrar a la app (no tiene un email real cargado). Cargalo para darle acceso — le va a llegar un mail para crear su contraseña.'
                }
              />
            </h2>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${hasAccess ? 'bg-moss/10 text-moss-dark' : 'bg-clay/10 text-clay'}`}>
              {hasAccess ? 'Con acceso' : 'Sin acceso'}
            </span>
          </div>

          {hasAccess ? (
            <SetPasswordForm studentId={student.id} />
          ) : (
            <GrantAccessForm studentId={student.id} defaultEmail={student.contact_email ?? ''} />
          )}
        </div>
      </div>

      {/* Plan y pagos: a todo el ancho, debajo de los datos de la cuenta. */}
      <div className="mt-6 space-y-6">
        <StudentBilling studentId={student.id} studentName={student.full_name} />
        <ExtraChargesSection studentId={student.id} />
      </div>

      {/* Calendario y plan fijo: a todo el ancho, que es donde más se aprovecha
          (una grilla semanal apretada en una columna angosta se lee peor). */}
      <div className="mt-6 space-y-6">
        <MonthSessions studentId={student.id} weekOffset={weekOffset} />

        <PlanEditorToggle>
          <p className="mb-2 flex items-center gap-1.5 text-xs text-ink/50">
            Cambiar plan fijo
            <InfoHint text="Esto cambia el plan de base — afecta todas las semanas futuras, no solo una fecha puntual." />
          </p>
          <StudentScheduleForm studentId={student.id} classOptions={classOptions} />
        </PlanEditorToggle>
      </div>
    </div>
  )
}
