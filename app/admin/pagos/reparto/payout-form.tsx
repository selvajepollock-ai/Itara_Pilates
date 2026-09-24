'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { recordInstructorPayout, deleteInstructorPayout } from '../actions'
import { formatARS } from '@/lib/currency'

type Payout = { id: string; amount: number; paid_at: string; notes: string | null }

export function PayoutForm({
  instructorId,
  month,
  suggested,
  payouts,
}: {
  instructorId: string
  month: string
  suggested: number
  payouts: Payout[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await recordInstructorPayout(formData)
      if (res?.error) {
        setError(res.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    if (!confirm('¿Borrar este pago registrado? Si fue un error, después podés cargarlo de nuevo.')) return
    startTransition(async () => {
      const res = await deleteInstructorPayout(id)
      if (res?.error) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="mt-4 border-t border-sand pt-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-ink/50">Pagos registrados</p>
        {!open && (
          <button type="button" onClick={() => setOpen(true)} className="btn-secondary-sm">
            Registrar pago
          </button>
        )}
      </div>

      {payouts.length === 0 && !open && <p className="mt-2 text-sm text-ink/40">Todavía no se le pagó nada este mes.</p>}

      {payouts.length > 0 && (
        <ul className="mt-2 divide-y divide-sand/60 rounded-xl border border-sand">
          {payouts.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span className="text-ink/60">
                {new Date(`${p.paid_at}T00:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                {p.notes ? <span className="text-ink/40"> · {p.notes}</span> : null}
              </span>
              <span className="flex items-center gap-2">
                <span className="font-medium text-ink">{formatARS(p.amount)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={isPending}
                  aria-label="Borrar pago"
                  className="rounded-full p-1 text-ink/30 hover:bg-clay/10 hover:text-clay"
                >
                  <Trash2 size={13} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <form action={handleSubmit} className="mt-3 grid gap-3 rounded-xl border border-dashed border-sand bg-linen/40 p-4 sm:grid-cols-4">
          <input type="hidden" name="instructor_id" value={instructorId} />
          <input type="hidden" name="month" value={month} />
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Monto</label>
            <input
              type="number"
              name="amount"
              min={0}
              step="0.01"
              defaultValue={suggested > 0 ? suggested : ''}
              required
              className="mt-1.5 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-moss"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Fecha</label>
            <input
              type="date"
              name="paid_at"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="mt-1.5 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-moss"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Nota (opcional)</label>
            <input
              type="text"
              name="notes"
              placeholder="Ej: transferencia, efectivo"
              className="mt-1.5 w-full rounded-lg border border-sand bg-white px-3 py-2 text-sm outline-none focus:border-moss"
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-4">
            <button type="submit" disabled={isPending} className="btn-primary-sm">
              {isPending ? 'Guardando...' : 'Guardar pago'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
    </div>
  )
}
