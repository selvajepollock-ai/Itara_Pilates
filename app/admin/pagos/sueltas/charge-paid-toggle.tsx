'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setExtraChargePaid } from '../actions'

export function ChargePaidToggle({ chargeId, paid }: { chargeId: string; paid: boolean }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    const next = !paid
    if (next && !confirm('¿Marcar este cargo como pagado?')) return
    if (!next && !confirm('¿Volver a marcar este cargo como pendiente?')) return
    startTransition(async () => {
      await setExtraChargePaid(chargeId, next)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50 ${
        paid
          ? 'border border-sand text-ink/50 hover:border-clay hover:text-clay'
          : 'bg-moss text-white hover:bg-moss-dark'
      }`}
    >
      {isPending ? '...' : paid ? 'Marcar pendiente' : 'Marcar pagado'}
    </button>
  )
}
