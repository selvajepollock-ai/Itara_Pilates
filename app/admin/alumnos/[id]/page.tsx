import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditStudentForm } from './edit-student-form'
import { SetPasswordForm } from './set-password-form'

export default async function EditarAlumnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: student } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone')
    .eq('id', id)
    .single()

  if (!student) notFound()

  return (
    <div className="max-w-md">
      <Link href="/admin/alumnos" className="text-sm text-moss hover:text-moss-dark">
        ← Volver a alumnos
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-moss">Alumnos</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">{student.full_name}</h1>

      <EditStudentForm student={student} />

      <h2 className="mt-10 text-xs uppercase tracking-[0.25em] text-moss">
        Restablecer contraseña
      </h2>
      <p className="mt-1 text-sm text-ink/50">
        Por si el alumno perdió el acceso. Le vas a tener que avisar la contraseña nueva.
      </p>
      <SetPasswordForm studentId={student.id} />
    </div>
  )
}
