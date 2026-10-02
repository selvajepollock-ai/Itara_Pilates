'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { normalize } from '../alumnos/format'
import { buildRows, dayLong, gapLabel, hourLabel, shortName } from './slots'
import { NameButton, type NameState } from './name-button'
import { SlotChip } from './slot-chip'
import type { ClassItem } from './types'

const GRID_BORDER = 'border-b border-r border-edge-divider'

type Props = {
  classes: ClassItem[]
  /** Lunes a viernes (o toda la semana si hay clases el fin de semana). */
  days: number[]
  selectedStudentId: string | null
  onOpenStudent: (id: string) => void
}

export function FixedTab({ classes, days, selectedStudentId, onOpenStudent }: Props) {
  const [query, setQuery] = useState('')
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [mobileDow, setMobileDow] = useState(days[0])

  const rows = useMemo(() => buildRows(classes, days), [classes, days])
  const visible = useMemo(() => classes.filter((c) => days.includes(c.dow)), [classes, days])

  // Totales: lugares fijos ocupados de los que hay (solo la asignación vigente, sin cancelaciones).
  const occupied = visible.reduce((n, c) => n + c.fixed.length, 0)
  const capacity = visible.reduce((n, c) => n + c.capacity, 0)
  const freeTotal = visible.reduce((n, c) => n + Math.max(c.capacity - c.fixed.length, 0), 0)

  const text = normalize(query.trim())
  const matches = (name: string) => text !== '' && normalize(name).includes(text)
  const matchingCells = text === '' ? 0 : visible.filter((c) => c.fixed.some((f) => matches(f.name))).length

  const stateOf = (studentId: string, name: string): NameState => {
    if (selectedStudentId === studentId) return 'selected'
    if (hoverId === studentId) return 'hover'
    if (text !== '') return matches(name) ? 'match' : 'dim'
    return 'normal'
  }

  const dayStats = (dow: number) => {
    const list = visible.filter((c) => c.dow === dow)
    return {
      list,
      occupied: list.reduce((n, c) => n + c.fixed.length, 0),
      capacity: list.reduce((n, c) => n + c.capacity, 0),
      free: list.reduce((n, c) => n + Math.max(c.capacity - c.fixed.length, 0), 0),
    }
  }

  const names = (c: ClassItem, full: boolean) => (
    <ul className={`grid gap-x-1 gap-y-0.5 text-[12.5px] grid-cols-2`}>
      {c.fixed.map((f) => (
        <li key={f.enrollmentId} className="min-w-0">
          <NameButton
            label={full ? f.name : shortName(f.name)}
            fullName={f.name}
            state={stateOf(f.studentId, f.name)}
            onClick={() => onOpenStudent(f.studentId)}
            onHover={(over) => setHoverId(over ? f.studentId : null)}
            className="w-full"
          />
        </li>
      ))}
      {Array.from({ length: Math.max(c.capacity - c.fixed.length, 0) }).map((_, i) => (
        <li
          key={`free-${i}`}
          className="rounded-[6px] border border-dashed border-slot-line px-1.5 py-0.5 text-muted"
        >
          Libre
        </li>
      ))}
    </ul>
  )

  const cellHead = (c: ClassItem) => {
    const free = Math.max(c.capacity - c.fixed.length, 0)
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tabular-nums text-ink">
          {c.fixed.length}/{c.capacity}
        </span>
        {free > 0 ? (
          <SlotChip tone="free">{free === 1 ? '1 libre' : `${free} libres`}</SlotChip>
        ) : (
          <SlotChip tone="full">Completa</SlotChip>
        )}
      </div>
    )
  }

  const mobileStats = dayStats(mobileDow)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-sm text-muted">
            Quién tiene lugar fijo en cada clase. No incluye cancelaciones ni recuperaciones.
          </p>
          <p className="mt-1 text-sm text-muted">
            <span className="font-semibold text-ink">{occupied}</span> lugares fijos ocupados de{' '}
            <span className="font-semibold text-ink">{capacity}</span> ·{' '}
            <span className="font-semibold text-slot-free-ink">{freeTotal} libres</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative block">
            <span className="sr-only">Buscar alumno en la grilla</span>
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar alumno en la grilla"
              className="h-11 w-full min-w-[240px] rounded-[12px] border border-edge-strong bg-white pl-9 pr-3 text-sm text-ink outline-none transition focus:border-moss"
            />
          </label>
          {text !== '' && (
            <span className="text-sm text-muted" role="status">
              {matchingCells === 0 ? 'Sin coincidencias' : `Está en ${matchingCells} ${matchingCells === 1 ? 'horario' : 'horarios'}`}
            </span>
          )}
        </div>
      </div>

      {/* ── Escritorio ─────────────────────────────────────────────── */}
      <div className="surface-card mt-4 hidden overflow-hidden lg:block">
        <div className="grid" style={{ gridTemplateColumns: `64px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className={`${GRID_BORDER} bg-edge-head`} />
          {days.map((dow) => {
            const s = dayStats(dow)
            return (
              <div
                key={dow}
                className={`${GRID_BORDER} flex items-baseline justify-between gap-2 bg-edge-head px-3 py-3`}
              >
                <span className="text-sm font-semibold text-ink">{dayLong(dow)}</span>
                <span className="text-xs tabular-nums text-muted">
                  {s.occupied}/{s.capacity}
                </span>
              </div>
            )
          })}

          {rows.map((row) =>
            row.kind === 'gap' ? (
              <div
                key={`gap-${row.from}`}
                style={{ gridColumn: '1 / -1' }}
                className="border-b border-edge-divider bg-edge-head px-4 py-2 text-center text-xs text-muted"
              >
                {gapLabel(row.from, row.to)}
              </div>
            ) : (
              <FixedRow key={row.start} start={row.start}>
                {days.map((dow) => {
                  const c = row.classes.get(dow)
                  return c ? (
                    <div key={dow} className={`${GRID_BORDER} min-h-[84px] space-y-2 bg-white p-2.5`}>
                      {cellHead(c)}
                      {names(c, false)}
                    </div>
                  ) : (
                    <div key={dow} className={`${GRID_BORDER} min-h-[84px] bg-slot-empty`} />
                  )
                })}
              </FixedRow>
            )
          )}
        </div>
      </div>

      {/* ── Celular ────────────────────────────────────────────────── */}
      <div className="mt-4 lg:hidden">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
          {days.map((dow) => {
            const active = dow === mobileDow
            const s = dayStats(dow)
            return (
              <button
                key={dow}
                type="button"
                aria-pressed={active}
                onClick={() => setMobileDow(dow)}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-[12px] border text-sm ${
                  active ? 'border-moss bg-moss text-white' : 'border-edge bg-white text-ink'
                }`}
              >
                <span className="font-semibold">{dayLong(dow).slice(0, 3)}</span>
                <span className={`text-[11px] ${active ? 'text-white/85' : 'text-slot-free-ink'}`}>{s.free} libres</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-sm text-muted">
          {dayLong(mobileDow)}: <span className="font-semibold text-ink">{mobileStats.occupied}</span> lugares fijos
          ocupados · <span className="font-semibold text-slot-free-ink">{mobileStats.free} libres</span>
        </p>
        <div className="mt-3 space-y-3">
          {mobileStats.list
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((c) => (
              <div key={c.id} className="surface-card space-y-3 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-semibold tabular-nums text-ink">{c.start}</span>
                  {cellHead(c)}
                </div>
                {names(c, true)}
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

function FixedRow({ start, children }: { start: string; children: React.ReactNode }) {
  return (
    <>
      <div className={`${GRID_BORDER} bg-edge-head px-2 py-3 text-right text-xs font-medium tabular-nums text-muted`}>
        {hourLabel(start)}
      </div>
      {children}
    </>
  )
}
