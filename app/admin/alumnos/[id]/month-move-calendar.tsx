'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cancelSession, bookRecovery } from '@/app/actions/recovery'
import { formatTime } from '@/lib/day-names'
import { displayClassType } from '@/lib/class-type-display'

type Cell = {
  date: string
  classId: string
  enrollmentId: string | null
  typeName: string
  isScheduled: boolean
  isMyFixedSlot: boolean
  hasRoom: boolean
} | null

type Selection = { enrollmentId: string; classId: string; sessionDate: string; creditId: string; typeName: string }

export function MonthMoveCalendar({
  studentId,
  weekLabel,
  prevOffset,
  nextOffset,
  dayLabels,
  cells,
}: {
  studentId: string
  weekLabel: string
  prevOffset: number
  nextOffset: number
  dayLabels: string[]
  cells: { hour: string; row: Cell[] }[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<Cell | null>(null)

  function proceedCancel(cell: Cell) {
    if (!cell) return
    setPendingConfirm(null)
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
  }

  function handleCellClick(cell: Cell) {
    if (!cell) return
    setError(null)

    if (!selection) {
      if (!cell.isMyFixedSlot || !cell.isScheduled) return
      setPendingConfirm(cell)
      return
    }

    if (cell.date === selection.sessionDate && cell.classId === selection.classId) {
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
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Semana {weekLabel}</p>
          <p className="mt-1 font-display text-lg italic text-ink">Calendario del alumno</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Link
            href={`?week=${prevOffset}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-ink/50 hover:border-moss hover:text-moss"
          >
            <ChevronLeft size={14} />
          </Link>
          <Link
            href={`?week=${nextOffset}`}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-sand text-ink/50 hover:border-moss hover:text-moss"
          >
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      {selection && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-clay/5 border border-clay/30 px-3 py-2 text-xs">
          <span className="text-clay">
            Moviendo {displayClassType(selection.typeName)} del {selection.sessionDate.slice(8, 10)} —
            elegí el casillero nuevo (click en la misma celda para cancelar el movimiento)
          </span>
          <button onClick={() => setSelection(null)} className="font-medium text-clay hover:underline">
            Cancelar
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-clay">{error}</p>}

      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[480px] gap-1" style={{ gridTemplateColumns: `48px repeat(5, 1fr)` }}>
          <div />
          {dayLabels.map((d) => (
            <div key={d} className="pb-0.5 text-center text-[10px] font-medium uppercase text-ink/40">
              {d}
            </div>
          ))}
          {cells.map(({ hour, row }) => (
            <>
              <div key={`h-${hour}`} className="flex items-center text-[11px] text-ink/40">
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
                    title={`${cell.date.slice(8, 10)} — ${displayClassType(cell.typeName)} ${formatTime(hour)}`}
                    className={`h-8 rounded-md border text-[11px] transition ${
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

      {pendingConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <p className="font-display text-xl italic text-ink">¿Cancelar esta clase?</p>
              <button onClick={() => setPendingConfirm(null)} className="text-ink/40 hover:text-ink">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-linen/60 p-3 text-sm text-ink/70">
              <p className="font-medium text-ink">
                {displayClassType(pendingConfirm.typeName)} — día {pendingConfirm.date.slice(8, 10)}
              </p>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={() => proceedCancel(pendingConfirm)}
                disabled={isPending}
                className="flex-1 rounded-full bg-clay px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isPending ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
              <button
                onClick={() => setPendingConfirm(null)}
                className="rounded-full border border-sand px-4 py-2.5 text-sm font-medium text-ink/60 hover:border-moss hover:text-moss"
              >
                Volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
