'use client'

import { useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { buildRows, cellInfo, dayLong, dayOfMonth, dayShort, gapLabel, hourLabel, plural, type CellInfo } from './slots'
import { CellChips, OccupancyBar, SlotChip } from './slot-chip'
import type { ClassItem, DayColumn, OccurrenceData } from './types'

const GRID_BORDER = 'border-b border-r border-edge-divider'

type Props = {
  classes: ClassItem[]
  columns: DayColumn[]
  occ: OccurrenceData
  today: string
  selected: { classId: string; date: string } | null
  /** Día elegido en el selector del celular. */
  mobileDate: string
  onMobileDate: (date: string) => void
  onOpen: (classId: string, date: string) => void
}

function ariaLabel(c: ClassItem, info: CellInfo, dow: number) {
  const day = dayLong(dow)
  return info.cancelledWhole ? `${day} ${c.start}, cancelada` : `${day} ${c.start}, ${info.attending} de ${c.capacity}`
}

/** Fondo y borde de una celda de clase según esté seleccionada o cancelada. */
function cellClasses(selected: boolean, cancelled: boolean) {
  if (selected) return 'bg-moss-soft shadow-[inset_0_0_0_2px_#5B7561]'
  if (cancelled)
    return 'bg-[repeating-linear-gradient(135deg,#FFFFFF_0_6px,#FAF3F1_6px_12px)] hover:shadow-[inset_0_0_0_2px_#CFDDD1]'
  return 'bg-white hover:shadow-[inset_0_0_0_2px_#CFDDD1]'
}

/** Resumen de la semana: los mismos números que ya calculaba la pantalla. */
export function weekTotals(classes: ClassItem[], columns: DayColumn[], occ: OccurrenceData) {
  let fixedFree = 0
  let freed = 0
  let recovering = 0
  let cancelled = 0
  for (const col of columns) {
    if (col.holiday) continue
    for (const c of classes) {
      if (c.dow !== col.dow) continue
      const info = cellInfo(c, col.date, occ)
      if (info.cancelledWhole) {
        cancelled++
        continue
      }
      fixedFree += info.fixedFree
      freed += info.freed
      recovering += info.recovering.length
    }
  }
  return { fixedFree, freed, recovering, cancelled }
}

export function WeekTab({ classes, columns, occ, today, selected, mobileDate, onMobileDate, onOpen }: Props) {
  const daysKey = columns.map((c) => c.dow).join(',')
  const rows = useMemo(() => buildRows(classes, daysKey.split(',').map(Number)), [classes, daysKey])
  const gridCols = `64px repeat(${columns.length}, minmax(0, 1fr))`

  const mobileCol = columns.find((c) => c.date === mobileDate) ?? columns[0]
  const mobileClasses = classes.filter((c) => c.dow === mobileCol.dow).sort((a, b) => a.start.localeCompare(b.start))

  return (
    <>
      {/* ── Escritorio ─────────────────────────────────────────────── */}
      <div className="surface-card hidden overflow-hidden lg:block">
        <div className="grid" style={{ gridTemplateColumns: gridCols }}>
          <div className={`${GRID_BORDER} bg-edge-head`} />
          {columns.map((col) => {
            const isToday = col.date === today
            return (
              <div
                key={col.date}
                className={`${GRID_BORDER} flex flex-col items-center justify-center gap-0.5 px-2 py-3 ${isToday ? 'bg-moss-soft' : 'bg-edge-head'}`}
              >
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                  {dayShort(col.dow)} {dayOfMonth(col.date)}
                  {isToday && (
                    <span className="rounded-full bg-moss px-2 py-px text-[10px] font-semibold text-white">Hoy</span>
                  )}
                </span>
                {col.holiday && <span className="text-[11px] text-muted">{col.holiday}</span>}
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
              <WeekRow
                key={row.start}
                start={row.start}
                row={row.classes}
                columns={columns}
                occ={occ}
                selected={selected}
                onOpen={onOpen}
              />
            )
          )}
        </div>
      </div>

      {/* ── Celular ────────────────────────────────────────────────── */}
      <div className="lg:hidden">
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
          {columns.map((col) => {
            const active = col.date === mobileCol.date
            const isToday = col.date === today
            return (
              <button
                key={col.date}
                type="button"
                aria-pressed={active}
                onClick={() => onMobileDate(col.date)}
                className={`flex min-h-[56px] flex-col items-center justify-center rounded-[12px] border text-sm ${
                  active ? 'border-moss bg-moss text-white' : 'border-edge bg-white text-ink'
                } ${isToday && !active ? 'border-b-2 border-b-moss' : ''}`}
              >
                <span className="text-[11px] opacity-80">{dayShort(col.dow)}</span>
                <span className="font-semibold tabular-nums">{dayOfMonth(col.date)}</span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 space-y-3">
          {mobileCol.holiday ? (
            <p className="surface-card px-4 py-8 text-center text-sm text-muted">Feriado: {mobileCol.holiday}</p>
          ) : mobileClasses.length === 0 ? (
            <p className="surface-card px-4 py-8 text-center text-sm text-muted">No hay clases este día.</p>
          ) : (
            mobileClasses.map((c) => {
              const info = cellInfo(c, mobileCol.date, occ)
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-label={ariaLabel(c, info, c.dow)}
                  onClick={() => onOpen(c.id, mobileCol.date)}
                  className={`surface-card flex w-full items-center gap-3 p-4 text-left ${cellClasses(false, info.cancelledWhole)}`}
                >
                  <div className="w-14 shrink-0">
                    <p className="text-base font-semibold tabular-nums text-ink">{c.start}</p>
                    <p className="text-xs text-muted">{c.typeName}</p>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {info.cancelledWhole ? (
                      <SlotChip tone="cancel">Cancelada</SlotChip>
                    ) : (
                      <>
                        <p className="text-[15px] font-semibold tabular-nums text-ink">
                          {info.attending}/{c.capacity}
                        </p>
                        <OccupancyBar
                          value={info.attending}
                          max={c.capacity}
                          full={info.fixedFree === 0 && info.freed === 0}
                        />
                        <CellChips fixedFree={info.fixedFree} freed={info.freed} recovering={info.recovering.length} />
                      </>
                    )}
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-muted" aria-hidden />
                </button>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}

function WeekRow({
  start,
  row,
  columns,
  occ,
  selected,
  onOpen,
}: {
  start: string
  row: Map<number, ClassItem>
  columns: DayColumn[]
  occ: OccurrenceData
  selected: Props['selected']
  onOpen: Props['onOpen']
}) {
  return (
    <>
      <div className={`${GRID_BORDER} bg-edge-head px-2 py-3 text-right text-xs font-medium tabular-nums text-muted`}>
        {hourLabel(start)}
      </div>
      {columns.map((col) => {
        const c = row.get(col.dow)
        if (!c) return <div key={col.date} className={`${GRID_BORDER} min-h-[84px] bg-slot-empty`} />
        if (col.holiday)
          return (
            <div
              key={col.date}
              className={`${GRID_BORDER} flex min-h-[84px] items-center justify-center bg-slot-empty text-xs text-muted`}
            >
              Feriado
            </div>
          )
        const info = cellInfo(c, col.date, occ)
        const isSelected = selected?.classId === c.id && selected.date === col.date
        const full = info.fixedFree === 0 && info.freed === 0
        return (
          <button
            key={col.date}
            type="button"
            aria-label={ariaLabel(c, info, col.dow)}
            aria-pressed={isSelected}
            onClick={() => onOpen(c.id, col.date)}
            className={`${GRID_BORDER} flex min-h-[84px] flex-col justify-between gap-2 p-2.5 text-left transition ${cellClasses(isSelected, info.cancelledWhole)}`}
          >
            {info.cancelledWhole ? (
              <>
                <span className="text-[15px] font-semibold text-muted">—</span>
                <SlotChip tone="cancel">Cancelada</SlotChip>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[15px] font-semibold tabular-nums text-ink">
                    {info.attending}/{c.capacity}
                  </span>
                  {info.avisaron.length > 0 && (
                    <span
                      className="text-[11px] text-muted"
                      title={plural(info.avisaron.length, 'aviso de ausencia', 'avisos de ausencia')}
                    >
                      fijos {info.fixedCount}
                    </span>
                  )}
                </div>
                <OccupancyBar value={info.attending} max={c.capacity} full={full} />
                <CellChips fixedFree={info.fixedFree} freed={info.freed} recovering={info.recovering.length} />
              </>
            )}
          </button>
        )
      })}
    </>
  )
}
