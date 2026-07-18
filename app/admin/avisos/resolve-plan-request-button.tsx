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
      className="whitespace-nowrap rounded-full border border-clay px-3 py-1.5 text-xs font-medium text-clay hover:bg-clay hover:text-white disabled:opacity-50"
    >
      {isPending ? '...' : 'Marcar resuelto'}
    </button>
  )
}
