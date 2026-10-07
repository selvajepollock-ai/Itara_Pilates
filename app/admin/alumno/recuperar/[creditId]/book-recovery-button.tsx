'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { bookRecovery } from '@/app/actions/recovery'

export function BookRecoveryButton({
  studentId,
  creditId,
  classId,
  sessionDate,
  redirectTo = '/alumno',
}: {
  studentId: string
  creditId: string
  classId: string
  sessionDate: string
  redirectTo?: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  function handleBook() {
    setConfirming(false)
    setError(null)
    startTransition(async () => {
      const res = await bookRecovery({ studentId, creditId, classId, sessionDate })
      if (res?.error) {
        setError(res.error)
        return
      }
      router.push(redirectTo)
      router.refresh()
    })
  }

  // La confirmación va dentro de la página: el cuadro del navegador puede estar bloqueado y el botón parecería no hacer nada.
  if (confirming) {
    return (
      <div className="max-w-[220px] text-right">
        <p className="text-xs text-ink/70">¿Confirmás la recuperación en este horario? Queda anotada al instante.</p>
        <div className="mt-1.5 flex justify-end gap-2">
          <button onClick={() => setConfirming(false)} className="btn-secondary-sm">
            No
          </button>
          <button onClick={handleBook} disabled={isPending} className="btn-primary-sm">
            {isPending ? 'Anotando...' : 'Sí, anotar'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <button onClick={() => setConfirming(true)} disabled={isPending} className="btn-primary-sm">
        Anotarme acá
      </button>
      {error && <p className="mt-1 text-xs text-clay">{error}</p>}
    </div>
  )
}
