'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { setExtraChargesComp, setExtraChargesPaid } from './actions'

/** Cobrar (o bonificar) una compra de clases sueltas completa, todas las clases a la vez. */
export function PurchaseActions({ ids, count, total }: { ids: string[]; count: number; total: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function run(fn: () => Promise<{ error?: string } | { success: boolean }>, message: string) {
    if (!confirm(message)) return
    startTransition(async () => {
      const res = await fn()
      if (res && 'error' in res && res.error) alert(res.error)
      router.refresh()
    })
  }

  const what = count === 1 ? 'esta clase suelta' : `estas ${count} clases sueltas`
  return (
    <div className="flex shrink-0 gap-1.5">
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => setExtraChargesPaid(ids, true), `¿Marcar ${what} como pagadas (${total})?`)}
        className="btn-primary-sm whitespace-nowrap"
      >
        {isPending ? '...' : 'Pagado'}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => run(() => setExtraChargesComp(ids, true), `¿Bonificar ${what}? No se le va a cobrar.`)}
        className="btn-secondary-sm whitespace-nowrap"
      >
        Bonificar
      </button>
    </div>
  )
}
