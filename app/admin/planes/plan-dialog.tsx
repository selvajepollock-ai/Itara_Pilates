'use client'

import { useRef, useState, useTransition } from 'react'
import { X } from 'lucide-react'
import { useSidePanel } from '@/app/components/use-side-panel'
import { formatARS } from '@/lib/currency'
import { createPlan, updatePlan } from './actions'
import { CATEGORY_LABEL, pricePerClass, type PlanItem } from './plan-math'

const LABEL = 'block text-sm font-semibold text-ink'
const FIELD =
  'mt-1.5 h-11 w-full rounded-[12px] border border-edge-strong bg-white px-3.5 text-sm text-ink outline-none transition focus:border-moss'

/** Modal "Nuevo plan" / "Editar plan". Usa las acciones createPlan y updatePlan de siempre. */
export function PlanDialog({
  plan,
  onClose,
  onSaved,
}: {
  /** Plan a editar; sin plan, es uno nuevo. */
  plan: PlanItem | null
  onClose: () => void
  onSaved: (message: string) => void
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  useSidePanel(panelRef, { isMobile: true, onClose, resetKey: plan?.id ?? 'new' })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [price, setPrice] = useState(plan ? String(plan.price) : '')
  const [cpw, setCpw] = useState(plan?.classesPerWeek ? String(plan.classesPerWeek) : '')

  // Solo "Pilates" (Fuerza ya no existe). Si el plan guardado tuviera otra categoría, se conserva al editar.
  const currentCategory = plan?.category ?? 'reformer'
  const categories = currentCategory === 'reformer' ? ['reformer'] : ['reformer', currentCategory]

  const perClass = pricePerClass(Number(price), cpw ? Number(cpw) : null)

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    startTransition(async () => {
      const result = plan ? await updatePlan(plan.id, fd) : await createPlan(fd)
      if (result?.error) {
        setError(result.error)
        return
      }
      onSaved(plan ? 'Cambios guardados' : 'Plan creado')
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(43,42,38,0.32)] sm:items-center sm:p-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0 cursor-default" onClick={onClose} tabIndex={-1} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={plan ? 'Editar plan' : 'Nuevo plan'}
        tabIndex={-1}
        className="relative max-h-[100dvh] w-full max-w-[480px] overflow-y-auto bg-white p-6 outline-none max-sm:h-[100dvh] max-sm:max-w-none sm:rounded-[18px]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-2xl font-normal italic leading-tight text-ink">
            {plan ? 'Editar plan' : 'Nuevo plan'}
          </h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="-mr-2 -mt-1 flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft hover:text-ink"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="plan-name" className={LABEL}>
              Nombre
            </label>
            <input
              id="plan-name"
              name="name"
              required
              defaultValue={plan?.name ?? ''}
              placeholder="Ej: 3x por semana"
              className={FIELD}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="plan-cpw" className={LABEL}>
                Clases por semana
              </label>
              <input
                id="plan-cpw"
                type="number"
                name="classes_per_week"
                min={1}
                value={cpw}
                onChange={(e) => setCpw(e.target.value)}
                placeholder="Ej: 2"
                className={FIELD}
              />
            </div>
            <div>
              <label htmlFor="plan-price" className={LABEL}>
                Precio mensual
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 mt-[3px] -translate-y-1/2 text-sm text-muted">$</span>
                <input
                  id="plan-price"
                  type="number"
                  name="price"
                  required
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={`${FIELD} pl-7`}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="plan-category" className={LABEL}>
              Categoría
            </label>
            <select id="plan-category" name="category" defaultValue={currentCategory} className={FIELD}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c] ?? c}
                </option>
              ))}
            </select>
          </div>

          <p className="rounded-[12px] bg-moss-soft px-4 py-3 text-[13px] text-slot-free-ink" role="status">
            {perClass !== null && Number(price) > 0
              ? `Equivale a ${formatARS(Math.round(perClass))} por clase (4 semanas por mes).`
              : 'Completá el precio y las clases por semana para ver cuánto sale cada clase.'}
          </p>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={isPending} className="btn-primary disabled:opacity-50">
              {isPending ? 'Guardando...' : plan ? 'Guardar cambios' : 'Crear plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
