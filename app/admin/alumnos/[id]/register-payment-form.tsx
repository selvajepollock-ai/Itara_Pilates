'use client'

import { useState, useTransition } from 'react'
import { registerPayment } from '../../planes/actions'

export function RegisterPaymentForm({
  subscriptionId,
  studentId,
  defaultAmount,
  suggestedNextDate,
}: {
  subscriptionId: string
  studentId: string
  defaultAmount: number
  suggestedNextDate: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSuccess(false)
    startTransition(async () => {
      const result = await registerPayment(subscriptionId, studentId, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
    })
  }

  return (
    <form action={handleSubmit} className="mt-2 space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Monto (ARS)
        </label>
        <input
          type="number"
          name="amount"
          min={0}
          step="0.01"
          defaultValue={defaultAmount}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Nueva fecha de vencimiento
        </label>
        <input
          type="date"
          name="new_end_date"
          required
          defaultValue={suggestedNextDate}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-5 py-2.5 text-xs font-medium text-white hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Registrando...' : 'Marcar como pagado'}
      </button>
      {error && <p className="text-sm text-clay">{error}</p>}
      {success && <p className="text-sm text-moss-dark">Pago registrado ✓</p>}
    </form>
  )
}
