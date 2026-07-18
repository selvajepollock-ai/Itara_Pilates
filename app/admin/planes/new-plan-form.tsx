'use client'

import { useRef, useState, useTransition } from 'react'
import { createPlan } from './actions'

export function NewPlanForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createPlan(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      formRef.current?.reset()
    })
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-dashed border-sand bg-white/50 p-5"
    >
      <div className="flex-1">
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Nombre</label>
        <input
          name="name"
          required
          placeholder="Ej: 3x por semana"
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        />
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Precio mensual (ARS)
        </label>
        <div className="mt-1.5 flex items-center rounded-lg border border-sand bg-linen/40 focus-within:border-moss focus-within:bg-white">
          <span className="pl-3.5 text-sm text-ink/40">$</span>
          <input
            type="number"
            name="price"
            required
            min={0}
            step="0.01"
            className="w-32 bg-transparent px-2 py-2.5 text-sm text-ink outline-none"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Agregando...' : '+ Agregar'}
      </button>
      {error && <p className="w-full text-sm text-clay">{error}</p>}
    </form>
  )
}
