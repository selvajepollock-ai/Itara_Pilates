'use client'

import { useState, useTransition } from 'react'
import { assignPlan } from '../../planes/actions'
import { formatARS } from '@/lib/currency'

type Plan = { id: string; name: string; price: number }

export function AssignPlanForm({
  studentId,
  plans,
  currentPlanId,
  defaultEndDate,
}: {
  studentId: string
  plans: Plan[]
  currentPlanId: string | null
  defaultEndDate: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await assignPlan(studentId, formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
    })
  }

  if (plans.length === 0) {
    return (
      <p className="text-sm text-ink/40">
        Todavía no hay planes activos. Creá uno en{' '}
        <a href="/admin/planes" className="text-moss hover:text-moss-dark">
          Planes
        </a>
        .
      </p>
    )
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Plan</label>
        <select
          name="plan_id"
          required
          defaultValue={currentPlanId ?? ''}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        >
          <option value="" disabled>
            Elegir...
          </option>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatARS(p.price)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
          Pagado hasta
        </label>
        <input
          type="date"
          name="end_date"
          required
          defaultValue={defaultEndDate}
          className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-5 py-2.5 text-xs font-medium text-white hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : currentPlanId ? 'Actualizar' : 'Asignar'}
      </button>
      {error && <p className="text-sm text-clay">{error}</p>}
      {saved && <p className="text-sm text-moss-dark">Guardado ✓</p>}
    </form>
  )
}
