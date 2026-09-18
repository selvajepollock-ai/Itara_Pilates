'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BedDouble } from 'lucide-react'
import { activateAllExtraCapacity } from './actions'

export function ActivateAllExtraCapacityButton({ pendingCount }: { pendingCount: number }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (
      !window.confirm(
        `Se va a sumar el cupo extra pendiente a la capacidad real de ${pendingCount} clase${pendingCount === 1 ? '' : 's'} de Reformer. ¿Confirmás que las camas nuevas ya están instaladas?`
      )
    ) {
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await activateAllExtraCapacity()
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-full border border-moss bg-moss/10 px-4 py-2 text-sm font-medium text-moss-dark transition hover:bg-moss/20"
      >
        <BedDouble size={14} strokeWidth={2} />
        {isPending ? 'Activando...' : `Activar camas nuevas (${pendingCount})`}
      </button>
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  )
}
