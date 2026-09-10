'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setExtraChargePaid, setExtraChargeComp } from '../actions'

export function ChargePaidToggle({
  chargeId,
  paid,
  comp = false,
}: {
  chargeId: string
  paid: boolean
  comp?: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function run(fn: () => Promise<unknown>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    startTransition(async () => {
      await fn()
      router.refresh()
    })
  }

  const pill = 'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium disabled:opacity-50'
  const outline = `${pill} border border-sand text-ink/50 hover:border-clay hover:text-clay`
  const solid = `${pill} bg-moss text-white hover:bg-moss-dark`

  if (comp) {
    return (
      <button
        onClick={() => run(() => setExtraChargeComp(chargeId, false), '¿Sacar el bonificado y volver a pendiente?')}
        disabled={isPending}
        className={outline}
      >
        {isPending ? '...' : 'Quitar bonificado'}
      </button>
    )
  }

  if (paid) {
    return (
      <button
        onClick={() => run(() => setExtraChargePaid(chargeId, false), '¿Volver a marcar como pendiente?')}
        disabled={isPending}
        className={outline}
      >
        {isPending ? '...' : 'Marcar pendiente'}
      </button>
    )
  }

  return (
    <div className="flex justify-end gap-1.5">
      <button
        onClick={() => run(() => setExtraChargePaid(chargeId, true), '¿Marcar este cargo como pagado?')}
        disabled={isPending}
        className={solid}
      >
        {isPending ? '...' : 'Pagado'}
      </button>
      <button
        onClick={() => run(() => setExtraChargeComp(chargeId, true), '¿Bonificar esta clase? No se le va a cobrar.')}
        disabled={isPending}
        className={outline}
      >
        Bonificar
      </button>
    </div>
  )
}
