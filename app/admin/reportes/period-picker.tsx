'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PeriodKey } from './format'

const OPTIONS: { key: PeriodKey; label: string; param: string | null }[] = [
  { key: 'mes', label: 'Este mes', param: 'mes' },
  { key: 'anterior', label: 'Mes anterior', param: 'anterior' },
  { key: '3m', label: 'Últimos 3 meses', param: '3m' },
  { key: 'anio', label: 'Este año', param: 'anio' },
  { key: 'custom', label: 'Personalizado', param: null },
]

const DATE_INPUT =
  'h-11 rounded-[12px] border border-edge-strong bg-white px-3 text-sm text-ink outline-none transition focus:border-moss'

/** Selector de período: se aplica al instante (sin botón "Aplicar"). */
export function PeriodPicker({ active, from, to }: { active: PeriodKey; from: string; to: string }) {
  const router = useRouter()
  const [custom, setCustom] = useState(active === 'custom')
  const [desde, setDesde] = useState(from)
  const [hasta, setHasta] = useState(to)

  function apply(nextDesde: string, nextHasta: string) {
    if (nextDesde && nextHasta && nextDesde <= nextHasta) {
      router.push(`/admin/reportes?desde=${nextDesde}&hasta=${nextHasta}`)
    }
  }

  const showCustom = custom || active === 'custom'

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label="Período"
        className="-mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:inline-flex sm:rounded-[12px] sm:bg-edge-row sm:p-1 sm:px-1"
      >
        {OPTIONS.map((o) => {
          const selected = o.key === 'custom' ? showCustom : !showCustom && active === o.key
          return (
            <button
              key={o.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                if (o.param) {
                  setCustom(false)
                  router.push(`/admin/reportes?periodo=${o.param}`)
                } else setCustom(true)
              }}
              className={`min-h-[40px] shrink-0 whitespace-nowrap rounded-full px-4 text-sm transition sm:rounded-[9px] ${
                selected
                  ? 'bg-white font-semibold text-ink shadow-sm max-sm:border max-sm:border-moss'
                  : 'text-muted hover:text-ink max-sm:border max-sm:border-edge max-sm:bg-white'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>

      {showCustom && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs text-muted">
            Desde
            <input
              type="date"
              lang="es-AR"
              value={desde}
              onChange={(e) => {
                setDesde(e.target.value)
                apply(e.target.value, hasta)
              }}
              className={`mt-1 block ${DATE_INPUT}`}
            />
          </label>
          <label className="text-xs text-muted">
            Hasta
            <input
              type="date"
              lang="es-AR"
              value={hasta}
              onChange={(e) => {
                setHasta(e.target.value)
                apply(desde, e.target.value)
              }}
              className={`mt-1 block ${DATE_INPUT}`}
            />
          </label>
        </div>
      )}
    </div>
  )
}
