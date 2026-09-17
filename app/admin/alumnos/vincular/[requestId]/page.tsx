import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SearchAndLink } from './search-and-link'

export default async function VincularPage({
  params,
}: {
  params: Promise<{ requestId: string }>
}) {
  const { requestId } = await params
  const supabase = await createClient()
  const { data: request } = await supabase
    .from('signup_requests')
    .select('id, first_name, last_name, email, phone, username, birth_date, status')
    .eq('id', requestId)
    .single()

  if (!request) notFound()

  const fullName = `${request.first_name} ${request.last_name}`.trim()

  return (
    <div className="max-w-2xl">
      <Link href="/admin/alumnos" className="text-sm text-moss hover:text-moss-dark">
        ← Volver a alumnos
      </Link>

      <p className="eyebrow mt-4">Solicitud de registro</p>
      <h1 className="page-title mt-2">{fullName}</h1>
      <p className="mt-2 text-sm text-ink/60">
        {request.email}
        {request.phone ? ` · ${request.phone}` : ''}
        {request.username ? ` · @${request.username}` : ''}
      </p>

      {request.status !== 'pending' ? (
        <div className="mt-6 rounded-2xl border border-sand bg-white p-6">
          <p className="text-sm text-ink/60">Esta solicitud ya fue procesada.</p>
        </div>
      ) : (
        <SearchAndLink
          requestId={request.id}
          defaultFullName={fullName}
          defaultEmail={request.email}
          defaultPhone={request.phone ?? ''}
          defaultUsername={request.username ?? ''}
          defaultBirthDate={request.birth_date ?? ''}
        />
      )}
    </div>
  )
}
