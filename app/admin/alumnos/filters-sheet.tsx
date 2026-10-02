'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import type { PlanOption } from './types'

const SELECT =
  'mt-1.5 h-12 w-full rounded-[12px] border border-edge-strong bg-white px-3 text-sm text-ink outline-none focus:border-moss'

/** Hoja inferior del celular con los selectores Profesor y Plan. */
export function FiltersSheet({
  open,
  onClose,
  instructors,
  plans,
  profesor,
  plan,
  onChange,
  onClear,
}: {
  open: boolean
  onClose: () => void
  instructors: { id: string; name: string }[]
  plans: PlanOption[]
  profesor: string
  plan: string
  onChange: (changes: { profesor?: string; plan?: string }) => void
  onClear: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Filtros">
      <button type="button" aria-label="Cerrar filtros" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-edge bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center justify-between">
          <p className="font-display text-xl italic text-ink">Filtros</p>
          <button
            type="button"
            aria-label="Cerrar filtros"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft"
          >
            <X size={18} />
          </button>
        </div>

        <label className="mt-2 block text-sm font-medium text-ink">
          Profesor
          <select value={profesor} onChange={(e) => onChange({ profesor: e.target.value })} className={SELECT}>
            <option value="">Todos</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
            <option value="sin">Sin asignar</option>
          </select>
        </label>

        <label className="mt-4 block text-sm font-medium text-ink">
          Plan
          <select value={plan} onChange={(e) => onChange({ plan: e.target.value })} className={SELECT}>
            <option value="">Todos</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onClear}
            className="h-12 flex-1 rounded-[12px] border border-edge-strong bg-white text-sm font-semibold text-ink"
          >
            Limpiar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-12 flex-1 rounded-[12px] bg-moss text-sm font-semibold text-white"
          >
            Ver resultados
          </button>
        </div>
      </div>
    </div>
  )
}
