'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BedDouble } from 'lucide-react'
import { activateExtraCapacity } from '../actions'

export function ActivateExtraCapacityButton({
  classId,
  pendingExtraCapacity,
}: {
  classId: string
  pendingExtraCapacity: number
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    startTransition(async () => {
      const result = await activateExtraCapacity(classId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-moss/30 bg-moss/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm text-ink/70">
        <BedDouble size={16} className="text-moss shrink-0" />
        <span>
          Hay <strong>{pendingExtraCapacity}</strong> {pendingExtraCapacity === 1 ? 'lugar extra cargado' : 'lugares extra cargados'} para cuando estén disponibles (ej: camas nuevas).
        </span>
      </div>
      <button type="button" onClick={handleClick} disabled={isPending} className="btn-primary-sm shrink-0">
        {isPending ? 'Activando...' : 'Activar ahora'}
      </button>
      {error && <p className="text-sm text-clay">{error}</p>}
    </div>
  )
}
