'use client'

import { useTransition } from 'react'
import { approveRecoveryCredit } from '@/app/actions/recovery'

export function ApproveRecoveryButton({ creditId }: { creditId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(() => {
      approveRecoveryCredit(creditId)
    })
  }

  return (
    <button
      onClick={handleApprove}
      disabled={isPending}
      className="whitespace-nowrap rounded-full bg-moss px-3 py-1.5 text-xs font-medium text-white hover:bg-moss-dark disabled:opacity-50"
    >
      {isPending ? '...' : 'Aprobar'}
    </button>
  )
}
