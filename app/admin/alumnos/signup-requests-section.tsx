'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, UserPlus } from 'lucide-react'
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
  const [copied, setCopied] = useState(false)
  const registroUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/registro` : 'https://itara-pilates.vercel.app/registro'

  function handleCopy() {
    navigator.clipboard.writeText(registroUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mb-6">
      <button
        onClick={handleCopy}
        className="flex w-full items-center justify-between rounded-2xl border border-dashed border-sand bg-white px-5 py-3 text-left transition hover:border-moss"
      >
        <span className="flex items-center gap-2 text-sm text-ink/70">
          <UserPlus size={15} className="text-moss" />
          Link de registro para compartir: <span className="text-ink/40">{registroUrl}</span>
        </span>
        <span className="flex items-center gap-1 text-xs font-medium text-moss">
          {copied ? (
            <>
              <Check size={13} /> Copiado
            </>
          ) : (
            <>
              <Copy size={13} /> Copiar
            </>
          )}
        </span>
      </button>

      {requests.length > 0 && (
        <div className="mt-3 rounded-2xl border border-clay/30 bg-clay/5 p-5">
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
                    href={`/admin/alumnos/nuevo?requestId=${r.id}&first_name=${encodeURIComponent(
                      r.first_name
                    )}&last_name=${encodeURIComponent(r.last_name)}&email=${encodeURIComponent(
                      r.email
                    )}&phone=${encodeURIComponent(r.phone ?? '')}`}
                    className="whitespace-nowrap rounded-full bg-moss px-3 py-1.5 text-xs font-medium text-white hover:bg-moss-dark"
                  >
                    Aceptar
                  </Link>
                  <RejectSignupButton requestId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
