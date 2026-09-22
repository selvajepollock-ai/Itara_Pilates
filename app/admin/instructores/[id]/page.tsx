import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { EditInstructorForm } from './edit-instructor-form'
import { SetInstructorPasswordForm } from './set-password-form'
import { GrantInstructorAccessForm } from './grant-access-form'
import { isNoAccessEmail } from '@/lib/auth-username'

export default async function EditarInstructorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: instructor } = await supabase
    .from('profiles')
    .select('id, full_name, email, username, phone, birth_date, roles')
    .eq('id', id)
    .single()

  if (!instructor) notFound()

  const hasAccess = !isNoAccessEmail(instructor.email)

  return (
    <div className="max-w-md">
      <Link href="/admin/instructores" className="text-sm text-moss hover:text-moss-dark">
        ← Volver al equipo
      </Link>

      <p className="eyebrow mt-4">Equipo</p>
      <h1 className="page-title mt-2">{instructor.full_name}</h1>

      <EditInstructorForm instructor={instructor} />

      <div className="mt-6 rounded-2xl border border-sand bg-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="section-title">Acceso a la app</h2>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${hasAccess ? 'bg-moss/10 text-moss-dark' : 'bg-clay/10 text-clay'}`}>
            {hasAccess ? 'Con acceso' : 'Sin acceso'}
          </span>
        </div>

        {hasAccess ? (
          <>
            <p className="mt-1 text-sm text-ink/50">
              Le vas a tener que avisar la contraseña nueva por otro medio.
            </p>
            <SetInstructorPasswordForm instructorId={instructor.id} />
          </>
        ) : (
          <GrantInstructorAccessForm instructorId={instructor.id} defaultEmail="" />
        )}
      </div>
    </div>
  )
}
