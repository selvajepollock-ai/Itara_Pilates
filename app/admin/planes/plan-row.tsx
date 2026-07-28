'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Pencil } from 'lucide-react'
import { setPlanActive, updatePlan } from './actions'
import { formatARS } from '@/lib/currency'

type Plan = { id: string; name: string; price: number; active: boolean }

export function PlanRow({ plan }: { plan: Plan }) {
  const [isEditing, setIsEditing] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleToggle() {
    startTransition(() => {
      setPlanActive(plan.id, !plan.active)
    })
  }

  function handleSave(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updatePlan(plan.id, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setIsEditing(false)
    })
  }

  if (isEditing) {
    return (
      <li className="px-5 py-4">
        <form action={handleSave} className="flex flex-wrap items-end gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Nombre</label>
            <input
              name="name"
              defaultValue={plan.name}
              required
              className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
              Precio mensual (ARS)
            </label>
            <input
              type="number"
              name="price"
              defaultValue={plan.price}
              required
              min={0}
              step="0.01"
              className="mt-1.5 w-32 rounded-lg border border-sand bg-linen/40 px-3 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-full bg-moss px-4 py-2 text-xs font-medium text-white hover:bg-moss-dark disabled:opacity-50"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="rounded-full border border-sand px-4 py-2 text-xs font-medium text-ink/60 hover:border-moss hover:text-moss"
          >
            Cancelar
          </button>
          {error && <p className="w-full text-sm text-clay">{error}</p>}
        </form>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between px-5 py-4">
      <div className={plan.active ? '' : 'opacity-40'}>
        <p className="font-display text-lg italic text-ink">
          {plan.name}
          {!plan.active && <span className="ml-2 text-xs not-italic text-ink/40">(inactivo)</span>}
        </p>
        <p className="mt-0.5 text-sm text-ink/60">{formatARS(plan.price)} / mes</p>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsEditing(true)}
          className="flex items-center gap-1 text-xs font-medium text-moss hover:text-moss-dark"
        >
          <Pencil size={13} strokeWidth={2} /> Editar
        </button>
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="flex items-center gap-1 text-xs font-medium text-clay hover:text-clay/70 disabled:opacity-50"
        >
          {plan.active ? (
            <>
              <EyeOff size={13} strokeWidth={2} /> Desactivar
            </>
          ) : (
            <>
              <Eye size={13} strokeWidth={2} /> Reactivar
            </>
          )}
        </button>
      </div>
    </li>
  )
}
