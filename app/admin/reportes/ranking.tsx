'use client'

import { useState } from 'react'
import { dayLong } from '../horarios/slots'
import type { OccupancyClass } from './occupancy-map'

type Mode = 'llenas' | 'lugar'

/** Ranking de clases: las 6 más llenas o las 6 con más lugar. */
export function Ranking({ classes }: { classes: OccupancyClass[] }) {
  const [mode, setMode] = useState<Mode>('llenas')
  const sorted = [...classes].sort((a, b) => (mode === 'llenas' ? b.pct - a.pct : a.pct - b.pct)).slice(0, 6)

  return (
    <div>
      <div role="tablist" aria-label="Orden del ranking" className="inline-flex gap-1 rounded-[12px] bg-edge-row p-1">
        {(
          [
            ['llenas', 'Más llenas'],
            ['lugar', 'Con más lugar'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`min-h-[36px] rounded-[9px] px-3.5 text-sm transition ${
              mode === key ? 'bg-white font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sorted.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Todavía no hay clases cargadas.</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {sorted.map((c) => (
            <li key={c.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate text-ink">
                  {c.typeName} · {dayLong(c.dow)} {c.start}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {c.enrolled}/{c.capacity} · {c.pct}%
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-edge-divider" aria-hidden>
                <div
                  className={`h-full rounded-full ${mode === 'llenas' ? 'bg-moss' : 'bg-state-none'}`}
                  style={{ width: `${Math.min(c.pct, 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
