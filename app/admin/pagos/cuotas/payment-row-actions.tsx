'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Ban } from 'lucide-react'
import { formatARS } from '@/lib/currency'
import { annulPayment, editPayment } from '../actions'

export function PaymentRowActions({
  paymentId,
  amount,
  notes,
}: {
  paymentId: string
  amount: number
  notes: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState<null | 'edit' | 'void'>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function close() {
    setOpen(null)
    setError(null)
  }

  function handleEdit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await editPayment(paymentId, formData)
      if (res?.error) return setError(res.error)
      close()
      router.refresh()
    })
  }

  function handleVoid(formData: FormData) {
    setError(null)
    const reason = String(formData.get('reason') ?? '')
    startTransition(async () => {
      const res = await annulPayment(paymentId, reason)
      if (res?.error) return setError(res.error)
      close()
      router.refresh()
    })
  }

  return (
    <div className="inline-flex items-center gap-1">
      <button
        onClick={() => setOpen('edit')}
        className="rounded-full p-1.5 text-ink/40 hover:bg-linen hover:text-ink"
        aria-label="Editar pago"
        title="Editar"
      >
        <Pencil size={14} />
      </button>
      <button
        onClick={() => setOpen('void')}
        className="rounded-full p-1.5 text-ink/40 hover:bg-clay/10 hover:text-clay"
        aria-label="Anular pago"
        title="Anular"
      >
        <Ban size={14} />
      </button>

      {(open === 'edit' || open === 'void') && (
        <>
          <div className="fixed inset-0 z-30 bg-ink/20" onClick={close} />
          <div className="fixed left-1/2 top-1/2 z-40 w-[min(92vw,360px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-sand bg-white p-5 text-left shadow-xl">
            {open === 'edit' ? (
              <form action={handleEdit} className="space-y-3">
                <p className="font-display text-lg italic text-ink">Editar pago</p>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Monto (ARS)</label>
                  <input
                    type="number"
                    name="amount"
                    min={0}
                    step="0.01"
                    defaultValue={amount}
                    className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm outline-none focus:border-moss focus:bg-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Nota</label>
                  <input
                    type="text"
                    name="notes"
                    defaultValue={notes}
                    className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm outline-none focus:border-moss focus:bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={close} className="btn-ghost-sm">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-primary-sm"
                  >
                    {isPending ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            ) : (
              <form action={handleVoid} className="space-y-3">
                <p className="font-display text-lg italic text-ink">Anular pago</p>
                <p className="text-sm text-ink/60">
                  Se anula el pago de <span className="font-medium text-ink">{formatARS(amount)}</span>. No se
                  borra: queda registrado con el motivo. La fecha "pagado hasta" del alumno no cambia
                  automáticamente.
                </p>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Motivo</label>
                  <input
                    type="text"
                    name="reason"
                    required
                    placeholder="Ej: cargado por error / duplicado"
                    className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm outline-none focus:border-moss focus:bg-white"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button type="button" onClick={close} className="btn-ghost-sm">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn-danger-sm"
                  >
                    {isPending ? 'Anulando...' : 'Anular pago'}
                  </button>
                </div>
              </form>
            )}
            {error && <p className="mt-2 text-sm text-clay">{error}</p>}
          </div>
        </>
      )}
    </div>
  )
}
