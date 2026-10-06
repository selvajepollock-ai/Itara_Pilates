'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { restoreSurcharge, waiveSurcharge } from '../../pagos/actions'

/** "Perdonar recargo" (solo esa cuota) o "Volver a aplicarlo". */
export function WaiveSurchargeButton({ subscriptionId, mode }: { subscriptionId: string; mode: "waive" | "restore" }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function run() {
    const message =
      mode === "waive"
        ? "¿Perdonar el recargo de esta cuota? Vale solo para esta cuota: si no paga, el mes siguiente corre la regla normal."
        : "¿Volver a aplicar el recargo a esta cuota?"
    if (!confirm(message)) return
    startTransition(async () => {
      const res = mode === "waive" ? await waiveSurcharge(subscriptionId) : await restoreSurcharge(subscriptionId)
      if (res && "error" in res && res.error) alert(res.error)
      router.refresh()
    })
  }

  return (
    <button type="button" onClick={run} disabled={isPending} className="btn-secondary-sm mt-2 disabled:opacity-50">
      {isPending ? "..." : mode === "waive" ? "Perdonar recargo" : "Volver a aplicar el recargo"}
    </button>
  )
}
