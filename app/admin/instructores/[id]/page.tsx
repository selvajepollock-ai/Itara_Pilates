import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditInstructorForm } from './edit-instructor-form'
import { SetInstructorPasswordForm } from './set-password-form'

export default async function EditarInstructorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: instructor } = await supabase
    .from('profiles')
    .select('id, full_name, username, phone, roles')
    .eq('id', id)
    .single()

  if (!instructor) notFound()

  return (
    <div className="max-w-md">
      <Link href="/admin/instructores" className="text-sm text-moss hover:text-moss-dark">
        ← Volver a instructores
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-moss">Instructores</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">{instructor.full_name}</h1>

      <EditInstructorForm instructor={instructor} />

      <h2 className="mt-10 text-xs uppercase tracking-[0.25em] text-moss">
        Restablecer contraseña
      </h2>
      <p className="mt-1 text-sm text-ink/50">
        Le vas a tener que avisar la contraseña nueva por otro medio.
      </p>
      <SetInstructorPasswordForm instructorId={instructor.id} />
    </div>
  )
}
