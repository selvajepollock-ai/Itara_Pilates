'use client'

import { useTransition } from 'react'
import { removeEnrollment } from '../actions'

export function RemoveEnrollmentButton({
  enrollmentId,
  classId,
}: {
  enrollmentId: string
  classId: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    if (!confirm('¿Quitar a este alumno de la clase?')) return
    startTransition(() => {
      removeEnrollment(enrollmentId, classId)
    })
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
    >
      {isPending ? '...' : 'Quitar'}
    </button>
  )
}
