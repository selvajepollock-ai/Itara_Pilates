'use client'

import { useTransition } from 'react'
import { removeEnrollment } from '../actions'

export function RemoveEnrollmentButton({
  enrollmentId,
  classId,
  studentName,
}: {
  enrollmentId: string
  classId: string
  studentName?: string
}) {
  const [isPending, startTransition] = useTransition()

  function handleRemove() {
    const quien = studentName ? studentName : 'este alumno'
    const ok = confirm(
      `Vas a sacar a ${quien} de este horario en TODAS las semanas siguientes.\n\n` +
        'Si solo falta un día puntual, no uses esto: entrá a la ficha del alumno y cancelá esa fecha.\n\n' +
        '¿Sacarlo del horario fijo?'
    )
    if (!ok) return
    startTransition(() => {
      removeEnrollment(enrollmentId, classId)
    })
  }

  return (
    <button
      onClick={handleRemove}
      disabled={isPending}
      className="whitespace-nowrap text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
    >
      {isPending ? '...' : 'Sacar del horario fijo'}
    </button>
  )
}
