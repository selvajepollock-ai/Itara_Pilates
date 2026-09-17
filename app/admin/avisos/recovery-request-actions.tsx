'use client'

import { useState, useTransition } from 'react'
import { approveRecoveryRequest, rejectRecoveryRequest } from '@/app/actions/recovery'

export function RecoveryRequestActions({ creditId }: { creditId: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState<'approved' | 'rejected' | null>(null)

  function handleApprove() {
    setError(null)
    startTransition(async () => {
      const res = await approveRecoveryRequest(creditId)
      if (res?.error) {
        setError(res.error)
        return
      }
      setResolved('approved')
    })
  }

  function handleReject() {
    if (!confirm('¿Rechazar este horario? El alumno va a poder elegir otro.')) return
    setError(null)
    startTransition(async () => {
      const res = await rejectRecoveryRequest(creditId)
      if (res?.error) {
        setError(res.error)
        return
      }
      setResolved('rejected')
    })
  }

  if (resolved === 'approved') return <p className="text-xs text-moss-dark">Aprobado ✓</p>
  if (resolved === 'rejected') return <p className="text-xs text-clay">Rechazado</p>

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={isPending}
          className="btn-primary-sm whitespace-nowrap"
        >
          {isPending ? '...' : 'Aprobar'}
        </button>
        <button
          onClick={handleReject}
          disabled={isPending}
          className="btn-danger-outline whitespace-nowrap"
        >
          Rechazar
        </button>
      </div>
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  )
}
