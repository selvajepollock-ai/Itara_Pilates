'use client'

import { useTransition } from 'react'
import { resolvePlanChangeRequest } from '@/app/actions/plan-requests'

export function ResolvePlanRequestButton({ requestId }: { requestId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleResolve() {
    startTransition(() => {
      resolvePlanChangeRequest(requestId)
    })
  }

  return (
    <button
      onClick={handleResolve}
      disabled={isPending}
      className="btn-danger-outline whitespace-nowrap"
    >
      {isPending ? '...' : 'Marcar resuelto'}
    </button>
  )
}
