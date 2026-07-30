'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cancelSession, bookRecovery } from '@/app/actions/recovery'
import { formatTime } from '@/lib/day-names'

type Cell = {
  date: string
  classId: string
  enrollmentId: string | null
  typeName: string
  isScheduled: boolean
  isMyFixedSlot: boolean
  hasRoom: boolean
} | null

type WeekData = {
  label: string
  days: string[]
  cells: { hour: string; row: Cell[] }[]
}

type Selection = { enrollmentId: string; classId: string; sessionDate: string; creditId: string; typeName: string }

export function MonthMoveCalendar({
  studentId,
  monthLabel,
  prevOffset,
  nextOffset,
  dayLabels,
  weeks,
}: {
  studentId: string
  monthLabel: string
  prevOffset: number
  nextOffset: number
  dayLabels: string[]
  weeks: WeekData[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleCellClick(cell: Cell) {
    if (!cell) return
    setError(null)

    // Caso 1: no hay nada seleccionado todavía, y clickeás SU clase fija -> cancelar y seleccionar
    if (!selection) {
      if (!cell.isMyFixedSlot || !cell.isScheduled) return
      if (!confirm(`¿Cancelar la clase del ${cell.date.slice(8, 10)} (${cell.typeName})?`)) return
      startTransition(async () => {
        const res = await cancelSession({
          studentId,
          enrollmentId: cell.enrollmentId!,
          classId: cell.classId,
          sessionDate: cell.date,
        })
        if (res?.error) {
          setError(res.error)
          return
        }
        if (res?.recoveryCreditId) {
          setSelection({
            enrollmentId: cell.enrollmentId!,
            classId: cell.classId,
            sessionDate: cell.date,
            creditId: res.recoveryCreditId,
            typeName: cell.typeName,
          })
        }
        router.refresh()
      })
      return
    }

    // Caso 2: ya hay algo seleccionado -> este click es el destino
    if (cell.date === selection.sessionDate && cell.classId === selection.classId) {
      // click en la misma celda: cancelar selección
      setSelection(null)
      return
    }
    if (!cell.hasRoom) return

    startTransition(async () => {
      const res = await bookRecovery({
        studentId,
        creditId: selection.creditId,
        classId: cell.classId,
        sessionDate: cell.date,
      })
      if (res?.error) {
        setError(res.error)
        return
      }
      setSelection(null)
      router.refresh()
    })
  }

  return (
    <div className="rounded-2xl border border-sand bg-white p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase capitalize tracking-[0.25em] text-moss">{monthLabel}</p>
          <p className="mt-1 font-display text-lg italic text-ink">Calendario del alumno</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`?month=${prevOffset}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-ink/50 hover:border-moss hover:text-moss"
          >
            <ChevronLeft size={14} />
          </Link>
          <Link
            href={`?month=${nextOffset}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-ink/50 hover:border-moss hover:text-moss"
          >
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {selection && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-clay/5 border border-clay/30 px-3 py-2 text-xs">
          <span className="text-clay">
            Moviendo {selection.typeName} del {selection.sessionDate.slice(8, 10)} — elegí el casillero
            nuevo (click en la misma celda para cancelar el movimiento)
          </span>
          <button onClick={() => setSelection(null)} className="font-medium text-clay hover:underline">
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-clay">{error}</p>}

      <div className="mt-4 space-y-5 overflow-x-auto">
        {weeks.map((week, wi) => (
          <div key={wi}>
            <p className="mb-1 text-[10px] uppercase tracking-wide text-ink/30">Semana {week.label}</p>
            <div
              className="grid min-w-[480px] gap-1"
              style={{ gridTemplateColumns: `48px repeat(5, 1fr)` }}
            >
              <div />
              {dayLabels.map((d) => (
                <div key={d} className="pb-0.5 text-center text-[9px] font-medium uppercase text-ink/40">
                  {d}
                </div>
              ))}
              {week.cells.map(({ hour, row }) => (
                <>
                  <div key={`h-${hour}`} className="flex items-center text-[10px] text-ink/40">
                    {formatTime(hour)}
                  </div>
                  {row.map((cell, di) => {
                    if (!cell) return <div key={di} />
                    const isSelected =
                      selection && selection.sessionDate === cell.date && selection.classId === cell.classId
                    const isValidTarget = selection && !isSelected && cell.hasRoom
                    const isClickable = selection ? isSelected || isValidTarget : cell.isMyFixedSlot && cell.isScheduled

                    return (
                      <button
                        key={di}
                        type="button"
                        disabled={isPending || (!isClickable && !isSelected)}
                        onClick={() => handleCellClick(cell)}
                        title={`${cell.date.slice(8, 10)} — ${cell.typeName} ${formatTime(hour)}`}
                        className={`h-7 rounded-md border text-[10px] transition ${
                          isSelected
                            ? 'border-clay bg-clay text-white animate-pulse'
                            : cell.isScheduled
                              ? 'border-moss bg-moss text-white'
                              : isValidTarget
                                ? 'border-moss/40 bg-moss/10 text-moss hover:bg-moss/20'
                                : 'border-sand/40 bg-transparent text-ink/15'
                        } ${isPending ? 'opacity-50' : ''}`}
                      >
                        {isSelected ? '↕' : cell.isScheduled ? '✓' : isValidTarget ? '+' : ''}
                      </button>
                    )
                  })}
                </>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-sand pt-4 text-xs">
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded bg-moss" />
          Clase agendada
        </span>
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded border border-moss/40 bg-moss/10" />
          Disponible para mover
        </span>
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded bg-clay" />
          Seleccionada (elegí destino)
        </span>
      </div>
    </div>
  )
}
