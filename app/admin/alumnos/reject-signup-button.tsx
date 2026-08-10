'use client'

import { useTransition } from 'react'
import { rejectSignupRequest } from './signup-requests-actions'

export function RejectSignupButton({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleReject() {
    if (!confirm('¿Rechazar esta solicitud?')) return
    startTransition(() => {
      rejectSignupRequest(requestId)
    })
  }

  return (
    <button
      onClick={handleReject}
      disabled={isPending}
      className="whitespace-nowrap rounded-full border border-sand px-3 py-1.5 text-xs font-medium text-ink/50 hover:border-clay hover:text-clay disabled:opacity-50"
    >
      {isPending ? '...' : 'Rechazar'}
    </button>
  )
}
