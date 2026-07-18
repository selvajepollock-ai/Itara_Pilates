'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelSession } from '@/app/actions/recovery'

export function ReprogramarButton({
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
  const [tooLate, setTooLate] = useState(false)

  function handleClick() {
    if (!confirm('¿Avisar que no vas y buscar otro horario esta semana?')) return
    setError(null)
    setTooLate(false)
    startTransition(async () => {
      const res = await cancelSession({ studentId, enrollmentId, classId, sessionDate })
      if (res?.error) {
        setError(res.error)
        return
      }
      if (res?.recoveryCreditId) {
        router.push(`/alumno/recuperar/${res.recoveryCreditId}`)
        return
      }
      setTooLate(true)
      router.refresh()
    })
  }

  if (tooLate) {
    return <p className="text-xs text-clay">Avisado, pero fuera de horario para reprogramar.</p>
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="rounded-full border border-clay px-3 py-1.5 text-xs font-medium text-clay transition hover:bg-clay hover:text-white disabled:opacity-50"
      >
        {isPending ? 'Procesando...' : 'Reprogramar'}
      </button>
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  )
}
