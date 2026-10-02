'use client'

import Link from 'next/link'
import { RejectSignupButton } from './reject-signup-button'

type SignupRequest = {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  created_at: string
}

export function SignupRequestsSection({ requests }: { requests: SignupRequest[] }) {
  // El link de registro para compartir ahora se copia desde el encabezado de Alumnos.
  if (requests.length === 0) return null

  return (
    <div className="rounded-2xl border border-clay/30 bg-clay/5 p-5">
          <p className="text-xs uppercase tracking-wide text-clay">
            Solicitudes nuevas ({requests.length})
          </p>
          <ul className="mt-3 space-y-2">
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-ink">
                    {r.first_name} {r.last_name}
                  </p>
                  <p className="text-xs text-ink/50">
                    {r.email}
                    {r.phone ? ` · ${r.phone}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Link
                    href={`/admin/alumnos/vincular/${r.id}`}
                    className="btn-primary-sm whitespace-nowrap"
                  >
                    Aceptar
                  </Link>
                  <RejectSignupButton requestId={r.id} />
                </div>
              </li>
            ))}
          </ul>
    </div>
  )
}
