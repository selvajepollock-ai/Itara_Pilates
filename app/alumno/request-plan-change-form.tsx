'use client'

import { useRef, useState, useTransition } from 'react'
import { requestPlanChange } from '@/app/actions/plan-requests'
import { formatARS } from '@/lib/currency'

type Plan = { id: string; name: string; price: number }

export function RequestPlanChangeForm({ plans }: { plans: Plan[] }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await requestPlanChange(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess(true)
      formRef.current?.reset()
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium text-moss hover:text-moss-dark"
      >
        Solicitar cambio de plan
      </button>
    )
  }

  return (
    <form ref={formRef} action={handleSubmit} className="mt-2 space-y-2">
      <select
        name="requested_plan_id"
        required
        defaultValue=""
        className="w-full rounded-lg border border-sand bg-linen/40 px-3 py-2 text-xs text-ink outline-none focus:border-moss focus:bg-white"
      >
        <option value="" disabled>
          Elegir plan nuevo...
        </option>
        {plans.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} — {formatARS(p.price)}
          </option>
        ))}
      </select>
      <input
        name="note"
        placeholder="Comentario (opcional)"
        className="w-full rounded-lg border border-sand bg-linen/40 px-3 py-2 text-xs text-ink outline-none focus:border-moss focus:bg-white"
      />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-4 py-1.5 text-xs font-medium text-white hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Enviando...' : 'Enviar pedido'}
      </button>
      {error && <p className="text-xs text-clay">{error}</p>}
      {success && <p className="text-xs text-moss-dark">Enviado — el estudio lo va a revisar ✓</p>}
    </form>
  )
}
