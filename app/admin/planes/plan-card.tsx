'use client'

import { useState, useTransition } from 'react'
import { Eye, EyeOff, Pencil } from 'lucide-react'
import { setPlanActive, updatePlan } from './actions'
import { formatARS } from '@/lib/currency'

type Plan = {
  id: string
  name: string
  price: number
  active: boolean
  category: string
  classes_per_week: number | null
}

const CATEGORY_LABEL: Record<string, string> = {
  reformer: 'Pilates',
  fuerza: 'Fuerza',
  ambos: 'Pilates + Fuerza',
}

const CATEGORY_CLASSES: Record<string, string> = {
  reformer: 'bg-moss/10 text-moss-dark',
  fuerza: 'bg-clay/10 text-clay',
  ambos: 'bg-blush text-ink',
}

export function PlanCard({ plan }: { plan: Plan }) {
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
      <div className="rounded-2xl border border-moss bg-white p-5">
        <form action={handleSave} className="space-y-3">
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Nombre</label>
            <input
              name="name"
              defaultValue={plan.name}
              required
              className="mt-1 w-full rounded-lg border border-sand bg-linen/40 px-3 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
              Precio (ARS)
            </label>
            <input
              type="number"
              name="price"
              defaultValue={plan.price}
              required
              min={0}
              step="0.01"
              className="mt-1 w-full rounded-lg border border-sand bg-linen/40 px-3 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
            />
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
              Categoría
            </label>
            <select
              name="category"
              defaultValue={plan.category}
              className="mt-1 w-full rounded-lg border border-sand bg-linen/40 px-3 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
            >
              <option value="reformer">Pilates</option>
              <option value="fuerza">Fuerza</option>
              <option value="ambos">Pilates + Fuerza</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
              Clases por semana (para calcular precio de clase suelta)
            </label>
            <input
              type="number"
              name="classes_per_week"
              min={1}
              defaultValue={plan.classes_per_week ?? ''}
              placeholder="Ej: 2"
              className="mt-1 w-full rounded-lg border border-sand bg-linen/40 px-3 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
            />
          </div>
          {error && <p className="text-sm text-clay">{error}</p>}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-moss px-4 py-1.5 text-xs font-medium text-white hover:bg-moss-dark disabled:opacity-50"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-full border border-sand px-4 py-1.5 text-xs font-medium text-ink/60 hover:border-moss hover:text-moss"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-sand bg-white p-5 ${plan.active ? '' : 'opacity-40'}`}>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_CLASSES[plan.category] ?? CATEGORY_CLASSES.reformer}`}>
        {CATEGORY_LABEL[plan.category] ?? 'Pilates'}
      </span>
      <p className="mt-3 font-display text-xl italic text-ink">
        {plan.name}
        {!plan.active && <span className="ml-2 text-xs not-italic text-ink/40">(inactivo)</span>}
      </p>
      <p className="mt-0.5 text-sm text-ink/60">{formatARS(plan.price)} / mes</p>

      <div className="mt-4 flex items-center gap-4 border-t border-sand pt-3">
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
    </div>
  )
}
