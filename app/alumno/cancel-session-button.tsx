'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelSession } from '@/app/actions/recovery'

export function CancelSessionButton({
  studentId,
  enrollmentId,
  classId,
  sessionDate,
}: {
  studentId: string
  enrollmentId: string
  classId: string
  sessionDate: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ withinDeadline: boolean } | null>(null)

  function handleCancel() {
    if (!confirm('¿Avisar que no vas a esta clase?')) return
    setError(null)
    startTransition(async () => {
      const res = await cancelSession({ studentId, enrollmentId, classId, sessionDate })
      if (res?.error) {
        setError(res.error)
        return
      }
      setResult({ withinDeadline: Boolean(res?.withinDeadline) })
      router.refresh()
    })
  }

  if (result) {
    return (
      <p className={`text-xs ${result.withinDeadline ? 'text-moss-dark' : 'text-clay'}`}>
        {result.withinDeadline
          ? 'Avisado — tenés una clase para recuperar esta semana ✓'
          : 'Avisado (fuera de horario, sin recuperación)'}
      </p>
    )
  }

  return (
    <div>
      <button
        onClick={handleCancel}
        disabled={isPending}
        className="text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
      >
        {isPending ? 'Avisando...' : 'No puedo ir'}
      </button>
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  )
}
