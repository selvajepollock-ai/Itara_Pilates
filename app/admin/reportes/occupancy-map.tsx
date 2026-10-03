'use client'

import { useState } from 'react'
import { buildRows, dayLong, dayShort, gapLabel, hourLabel } from '../horarios/slots'
import type { ClassItem } from '../horarios/types'

export type OccupancyClass = ClassItem & { enrolled: number; pct: number }

function cellTone(pct: number) {
  if (pct >= 100) return 'bg-[#3F5B46] text-white'
  if (pct >= 80) return 'bg-[#8FAE96] text-white'
  if (pct >= 60) return 'bg-[#CFDDD1] text-slot-free-ink'
  return 'bg-[#F3F6F3] text-[#4A463F]'
}

const LEGEND = [
  { label: 'Menos de 60%', cls: 'bg-[#F3F6F3]' },
  { label: '60–79%', cls: 'bg-[#CFDDD1]' },
  { label: '80–99%', cls: 'bg-[#8FAE96]' },
  { label: '100%', cls: 'bg-[#3F5B46]' },
]

const tip = (c: OccupancyClass) => `${dayLong(c.dow)} ${c.start}: ${c.enrolled} de ${c.capacity}`

/** Mapa de ocupación por horario: la misma grilla de días × horas de Horarios. */
export function OccupancyMap({ classes, days }: { classes: OccupancyClass[]; days: number[] }) {
  const rows = buildRows(classes, days)
  const [mobileDow, setMobileDow] = useState(days[0])
  const mobileList = classes.filter((c) => c.dow === mobileDow).sort((a, b) => a.start.localeCompare(b.start))

  return (
    <div>
      {/* Escritorio */}
      <div className="hidden lg:block">
        <div className="grid gap-1" style={{ gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div />
          {days.map((d) => (
            <div key={d} className="pb-1 text-center text-xs font-semibold text-muted">
              {dayShort(d)}
            </div>
          ))}
          {rows.map((row) =>
            row.kind === 'gap' ? (
              <div key={`gap-${row.from}`} style={{ gridColumn: '1 / -1' }} className="py-1 text-center text-[11px] text-muted">
                {gapLabel(row.from, row.to)}
              </div>
            ) : (
              <MapRow key={row.start} start={row.start} row={row.classes as Map<number, OccupancyClass>} days={days} />
            )
          )}
        </div>
      </div>

      {/* Celular: selector de día + una fila por horario */}
      <div className="lg:hidden">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={d === mobileDow}
              onClick={() => setMobileDow(d)}
              className={`min-h-[44px] rounded-[12px] border text-sm font-semibold ${
                d === mobileDow ? 'border-moss bg-moss text-white' : 'border-edge bg-white text-ink'
              }`}
            >
              {dayShort(d)}
            </button>
          ))}
        </div>
        <ul className="mt-3 space-y-1.5">
          {mobileList.map((c) => (
            <li key={c.id} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-xs font-medium tabular-nums text-muted">{c.start}</span>
              <span
                title={tip(c)}
                aria-label={`${tip(c)}, ${c.pct}%`}
                className={`flex h-8 flex-1 items-center justify-center rounded-[6px] text-[12px] font-semibold tabular-nums ${cellTone(c.pct)}`}
              >
                {c.pct}% · {c.enrolled}/{c.capacity}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted">
        {LEGEND.map((l) => (
          <li key={l.label} className="inline-flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-[3px] ${l.cls}`} aria-hidden />
            {l.label}
          </li>
        ))}
        <li className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[3px] border border-dashed border-slot-line bg-edge-head" aria-hidden />
          Sin clase
        </li>
      </ul>
    </div>
  )
}

function MapRow({ start, row, days }: { start: string; row: Map<number, OccupancyClass>; days: number[] }) {
  return (
    <>
      <div className="flex h-[30px] items-center justify-end pr-2 text-[11px] font-medium tabular-nums text-muted">
        {hourLabel(start)}
      </div>
      {days.map((d) => {
        const c = row.get(d)
        return c ? (
          <div
            key={d}
            title={tip(c)}
            aria-label={`${tip(c)}, ${c.pct}%`}
            className={`flex h-[30px] items-center justify-center rounded-[6px] text-[11.5px] font-semibold tabular-nums ${cellTone(c.pct)}`}
          >
            {c.pct}%
          </div>
        ) : (
          <div key={d} className="h-[30px] rounded-[6px] border border-dashed border-slot-line bg-edge-head" aria-hidden />
        )
      })}
    </>
  )
}
