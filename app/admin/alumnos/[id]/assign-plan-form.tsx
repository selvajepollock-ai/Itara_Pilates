'use client'

import { useState, useTransition } from 'react'
import { assignPlan } from '../../pagos/actions'
import { formatARS } from '@/lib/currency'

type Plan = { id: string; name: string; price: number }

export function AssignPlanForm({
  studentId,
  plans,
  currentPlanId,
  defaultEndDate,
  currentComp = false,
  currentCompReason = '',
}: {
  studentId: string
  plans: Plan[]
  currentPlanId: string | null
  defaultEndDate: string
  currentComp?: boolean
  currentCompReason?: string
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [comp, setComp] = useState(currentComp)

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

      <label className="flex items-start gap-2 rounded-lg border border-sand bg-linen/30 px-3 py-2.5">
        <input
          type="checkbox"
          name="comp"
          checked={comp}
          onChange={(e) => setComp(e.target.checked)}
          className="mt-0.5"
        />
        <span className="text-sm text-ink/80">
          Sin cargo (bonificado)
          <span className="block text-xs text-ink/45">
            Ocupa lugar pero no se le cobra ni cuenta como deuda. Queda así hasta que lo desmarques.
          </span>
        </span>
      </label>

      {comp ? (
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">
            Motivo (opcional)
          </label>
          <input
            type="text"
            name="comp_reason"
            defaultValue={currentCompReason}
            placeholder="Ej: vale de cumpleaños, canje, staff"
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none focus:border-moss focus:bg-white"
          />
        </div>
      ) : (
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
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-primary-sm"
      >
        {isPending ? 'Guardando...' : currentPlanId ? 'Actualizar' : 'Asignar'}
      </button>
      {error && <p className="text-sm text-clay">{error}</p>}
      {saved && <p className="text-sm text-moss-dark">Guardado ✓</p>}
    </form>
  )
}
