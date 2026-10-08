'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import {
  cancelSession,
  bookRecovery,
  addExtraClassesBatch,
  undoSessionCancellation,
  moveStudentSession,
  undoMovedSession,
} from '@/app/actions/recovery'
import { formatTime } from '@/lib/day-names'
import { displayClassType } from '@/lib/class-type-display'

type Cell = {
  date: string
  hour: string
  classId: string
  enrollmentId: string | null
  typeName: string
  isScheduled: boolean
  isMyFixedSlot: boolean
  isMyCancelledToday: boolean
  hasRoom: boolean
  instructorId: string | null
  isPast: boolean
  /** Su clase de siempre de esta fecha, que el estudio le movió a otro horario. */
  movedAway: boolean
  /** Esta clase es una que el estudio le movió (id para deshacerlo). */
  movedCreditId: string | null
} | null

type Selection = { enrollmentId: string; classId: string; sessionDate: string; creditId: string; typeName: string }
type ExtraSelection = { classId: string; sessionDate: string; typeName: string }

const dayText = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'numeric' })

export function MonthMoveCalendar({
  studentId,
  weekLabel,
  prevOffset,
  nextOffset,
  dayLabels,
  cells,
  credits,
  dropInPrice,
  hasPlan,
  tierPrices,
}: {
  studentId: string
  weekLabel: string
  prevOffset: number
  nextOffset: number
  dayLabels: { name: string; dayNum: number; isToday: boolean }[]
  cells: { hour: string; row: Cell[] }[]
  /** Recuperaciones ya disponibles (sin haber cancelado recién): se eligen desde el aviso de arriba del calendario. */
  credits: { id: string; typeName: string; sourceDate: string | null; until: string }[]
  dropInPrice: number
  hasPlan: boolean
  tierPrices: { 1: number; 2: number; 3: number; 4: number }
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selection, setSelection] = useState<Selection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<Cell | null>(null)
  // 'move' = cancelar (y recuperar ahora o más tarde); 'swap' = mover a otro horario en un solo paso; 'extra' = clases pagas.
  const [mode, setMode] = useState<'move' | 'swap' | 'extra'>('move')
  const [moveFrom, setMoveFrom] = useState<Cell>(null)
  const [moveTarget, setMoveTarget] = useState<Cell>(null)
  const [undoTarget, setUndoTarget] = useState<Cell>(null)
  const [extraSelections, setExtraSelections] = useState<ExtraSelection[]>([])
  const [extraDone, setExtraDone] = useState(false)
  const [undoneDone, setUndoneDone] = useState(false)
  const [movedDone, setMovedDone] = useState(false)

  function formatPrice(n: number) {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
  }

  const extraCount = extraSelections.length
  const extraUnitPrice = hasPlan
    ? dropInPrice
    : extraCount <= 1
      ? tierPrices[1]
      : extraCount === 2
        ? tierPrices[2]
        : extraCount === 3
          ? tierPrices[3]
          : tierPrices[4]
  const extraTotal = extraUnitPrice * extraCount

  function toggleExtra(cell: Cell) {
    if (!cell) return
    const key = `${cell.classId}_${cell.date}`
    setExtraSelections((prev) => {
      const exists = prev.some((s) => `${s.classId}_${s.sessionDate}` === key)
      if (exists) return prev.filter((s) => `${s.classId}_${s.sessionDate}` !== key)
      return [...prev, { classId: cell.classId, sessionDate: cell.date, typeName: cell.typeName }]
    })
  }

  function confirmExtraBatch() {
    if (extraSelections.length === 0) return
    setError(null)
    startTransition(async () => {
      const res = await addExtraClassesBatch({
        studentId,
        selections: extraSelections.map((s) => ({ classId: s.classId, sessionDate: s.sessionDate })),
      })
      if (res?.error) {
        setError(res.error)
        return
      }
      setExtraSelections([])
      setExtraDone(true)
      router.refresh()
    })
  }

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

  function handleUndoCancellation(cell: Cell) {
    if (!cell || !cell.enrollmentId) return
    setError(null)
    setUndoneDone(false)
    startTransition(async () => {
      const res = await undoSessionCancellation({
        studentId,
        enrollmentId: cell.enrollmentId!,
        classId: cell.classId,
        sessionDate: cell.date,
      })
      if (res?.error) {
        setError(res.error)
        return
      }
      setUndoneDone(true)
      router.refresh()
    })
  }

  // En "Mover clase": la clase de origen es una clase fija suya que todavía no empezó; el destino, un horario libre
  // con el mismo profesor que todavía no empezó. El servidor vuelve a validar todo.
  function swapTarget(cell: Cell) {
    return (
      !!cell &&
      !!moveFrom &&
      cell.hasRoom &&
      !cell.isScheduled &&
      !cell.isMyFixedSlot &&
      !cell.isPast &&
      !!cell.instructorId &&
      cell.instructorId === moveFrom.instructorId
    )
  }

  function confirmMove() {
    if (!moveFrom || !moveTarget) return
    const from = moveFrom
    const to = moveTarget
    setError(null)
    startTransition(async () => {
      const res = await moveStudentSession({
        studentId,
        fromClassId: from.classId,
        fromDate: from.date,
        toClassId: to.classId,
        toDate: to.date,
      })
      if (res?.error) {
        setError(res.error)
        setMoveTarget(null)
        return
      }
      setMoveFrom(null)
      setMoveTarget(null)
      setMovedDone(true)
      router.refresh()
    })
  }

  function confirmUndoMove() {
    if (!undoTarget?.movedCreditId) return
    const creditId = undoTarget.movedCreditId
    setError(null)
    startTransition(async () => {
      const res = await undoMovedSession({ studentId, creditId })
      if (res?.error) setError(res.error)
      else setMovedDone(true)
      setUndoTarget(null)
      router.refresh()
    })
  }

  function handleCellClick(cell: Cell) {
    if (!cell) return
    setError(null)
    setMovedDone(false)

    if (mode === 'swap') {
      if (!moveFrom) {
        if (cell.movedCreditId) {
          setUndoTarget(cell)
          return
        }
        if (cell.isMyFixedSlot && cell.isScheduled && !cell.isPast) setMoveFrom(cell)
        return
      }
      if (cell.date === moveFrom.date && cell.classId === moveFrom.classId) {
        setMoveFrom(null)
        return
      }
      if (swapTarget(cell)) setMoveTarget(cell)
      return
    }

    if (mode === 'extra') {
      if (cell.isScheduled || !cell.hasRoom) return
      toggleExtra(cell)
      return
    }

    if (!selection) {
      if (cell.isMyCancelledToday) {
        handleUndoCancellation(cell)
        return
      }
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
        <p className="font-display text-lg italic text-ink">Calendario del alumno</p>
        <div className="flex items-center gap-1.5 rounded-full border border-moss/30 bg-moss/5 py-1 pl-1 pr-3">
          <Link
            href={`?week=${prevOffset}`}
            className="icon-btn-sm h-7 w-7"
          >
            <ChevronLeft size={14} />
          </Link>
          <p className="text-sm font-semibold text-moss-dark whitespace-nowrap">Semana {weekLabel}</p>
          <Link
            href={`?week=${nextOffset}`}
            className="icon-btn-sm h-7 w-7"
          >
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setMode('swap')
            setSelection(null)
            setExtraSelections([])
            setMoveFrom(null)
            setMoveTarget(null)
          }}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            mode === 'swap' ? 'border-moss bg-moss text-white' : 'border-sand text-ink/50 hover:border-moss'
          }`}
        >
          Mover clase
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('move')
            setSelection(null)
            setExtraSelections([])
            setMoveFrom(null)
            setMoveTarget(null)
          }}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            mode === 'move' ? 'border-moss bg-moss text-white' : 'border-sand text-ink/50 hover:border-moss'
          }`}
        >
          Cancelar clase
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('extra')
            setSelection(null)
            setMoveFrom(null)
            setMoveTarget(null)
          }}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
            mode === 'extra' ? 'border-clay bg-clay text-white' : 'border-sand text-ink/50 hover:border-clay'
          }`}
        >
          + Agregar clases extra (pagas)
        </button>
      </div>

      {mode === 'swap' && (
        <div className="mt-3 space-y-2 rounded-xl border border-moss/30 bg-moss/5 px-3 py-2.5 text-xs">
          {movedDone && <p className="font-medium text-moss-dark">Listo ✓</p>}
          {!moveFrom && !undoTarget && (
            <p className="text-ink/70">
              Tocá la clase de la alumna que querés mover (✓). Después elegí el horario nuevo: tiene que ser con el mismo profesor y con lugar.
              No usa ninguna recuperación. Para deshacer un cambio, tocá la clase movida.
            </p>
          )}
          {moveFrom && !moveTarget && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink/70">
                Moviendo la clase del {dayText(moveFrom.date)} {formatTime(moveFrom.hour)}: elegí el horario nuevo (mismo profesor, con lugar).
              </span>
              <button onClick={() => setMoveFrom(null)} className="font-medium text-clay hover:underline">
                Cancelar
              </button>
            </div>
          )}
          {moveFrom && moveTarget && (
            <div>
              <p className="text-ink">
                Se libera la clase del <strong>{dayText(moveFrom.date)} {formatTime(moveFrom.hour)}</strong> y se anota en la del{' '}
                <strong>{dayText(moveTarget.date)} {formatTime(moveTarget.hour)}</strong>. No usa ninguna recuperación.
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={confirmMove} disabled={isPending} className="btn-primary-sm">
                  {isPending ? 'Moviendo...' : 'Sí, mover'}
                </button>
                <button onClick={() => setMoveTarget(null)} className="btn-secondary-sm">
                  No
                </button>
              </div>
            </div>
          )}
          {undoTarget && (
            <div>
              <p className="text-ink">
                ¿Deshacer el cambio? La alumna vuelve a su clase de siempre y se libera la del{' '}
                <strong>{dayText(undoTarget.date)} {formatTime(undoTarget.hour)}</strong>.
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={confirmUndoMove} disabled={isPending} className="btn-primary-sm">
                  {isPending ? 'Deshaciendo...' : 'Sí, deshacer'}
                </button>
                <button onClick={() => setUndoTarget(null)} className="btn-secondary-sm">
                  No
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {!selection && mode === 'move' && credits.length > 0 && (
        <div className="mt-3 space-y-2 rounded-xl border border-moss/30 bg-moss/5 px-3 py-2.5 text-xs">
          <p className="font-medium text-moss-dark">
            {credits.length === 1 ? 'Tiene 1 recuperación disponible' : `Tiene ${credits.length} recuperaciones disponibles`}
          </p>
          {credits.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-ink/70">
                {displayClassType(c.typeName)}
                {c.sourceDate ? ` · por la clase del ${c.sourceDate.slice(8, 10)}/${c.sourceDate.slice(5, 7)}` : ''} · vale hasta el{' '}
                {c.until.slice(8, 10)}/{c.until.slice(5, 7)}
              </span>
              <button
                type="button"
                onClick={() => {
                  setError(null)
                  setSelection({
                    enrollmentId: '',
                    classId: '',
                    sessionDate: c.sourceDate ?? c.until,
                    creditId: c.id,
                    typeName: c.typeName,
                  })
                }}
                className="btn-primary-sm"
              >
                Elegir clase para recuperar
              </button>
            </div>
          ))}
        </div>
      )}

      {selection && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-clay/5 border border-clay/30 px-3 py-2 text-xs">
          <span className="text-clay">
            Recuperando {displayClassType(selection.typeName)} (por la clase del {selection.sessionDate.slice(8, 10)}) —
            elegí el casillero nuevo
          </span>
          <button onClick={() => setSelection(null)} className="font-medium text-clay hover:underline">
            Cancelar
          </button>
        </div>
      )}

      {mode === 'extra' && (
        <div className="mt-3 rounded-xl bg-clay/5 border border-clay/30 px-3 py-3 text-xs text-clay">
          <p>
            Click en los casilleros con lugar (+) para elegir una o varias clases. El precio se calcula
            según cuántas elijas en esta misma tanda.
          </p>
          {!hasPlan && (
            <p className="mt-1.5 text-[11px] text-clay/70">
              1 clase: {formatPrice(tierPrices[1])} · 2: {formatPrice(tierPrices[2])} c/u · 3:{' '}
              {formatPrice(tierPrices[3])} c/u · 4 o más: {formatPrice(tierPrices[4])} c/u
            </p>
          )}
          {extraCount > 0 && (
            <div className="mt-2.5 flex items-center justify-between border-t border-clay/20 pt-2.5">
              <span className="font-medium">
                {extraCount} clase{extraCount > 1 ? 's' : ''} seleccionada{extraCount > 1 ? 's' : ''} ·{' '}
                {formatPrice(extraUnitPrice)} c/u · Total {formatPrice(extraTotal)}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setExtraSelections([])}
                  className="rounded-full border border-clay/40 px-3 py-1 text-[11px] font-medium text-clay hover:bg-clay/10"
                >
                  Vaciar
                </button>
                <button
                  onClick={confirmExtraBatch}
                  disabled={isPending}
                  className="rounded-full bg-clay px-3 py-1 text-[11px] font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {isPending ? 'Confirmando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs text-clay">{error}</p>}
      {extraDone && (
        <p className="mt-2 text-xs text-moss-dark">Clases extra agregadas ✓ — se sumaron a lo que debe.</p>
      )}
      {undoneDone && (
        <p className="mt-2 text-xs text-moss-dark">Deshecho ✓ — vuelve a contar como que viene normal, sin cargo.</p>
      )}

      <div className="mt-4 overflow-x-auto">
        <div className="grid min-w-[480px] gap-1" style={{ gridTemplateColumns: `48px repeat(5, 1fr)` }}>
          <div />
          {dayLabels.map((d) => (
            <div
              key={d.name}
              className={`flex flex-col items-center gap-0.5 pb-1 text-center text-[10px] font-medium uppercase ${
                d.isToday ? 'text-moss-dark' : 'text-ink/40'
              }`}
            >
              <span>{d.name}</span>
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full font-display text-[11px] not-italic ${
                  d.isToday ? 'bg-moss text-white' : 'text-ink/60'
                }`}
              >
                {d.dayNum}
              </span>
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
                const isMoveFrom = mode === 'swap' && !!moveFrom && moveFrom.date === cell.date && moveFrom.classId === cell.classId
                const isExtraSelected = extraSelections.some(
                  (s) => s.classId === cell.classId && s.sessionDate === cell.date
                )
                const isExtraTarget = mode === 'extra' && !cell.isScheduled && cell.hasRoom
                const isClickable =
                  mode === 'extra'
                    ? isExtraTarget
                    : mode === 'swap'
                      ? moveFrom
                        ? isMoveFrom || swapTarget(cell)
                        : !!cell.movedCreditId || (cell.isMyFixedSlot && cell.isScheduled && !cell.isPast)
                      : selection
                        ? isSelected || isValidTarget
                        : (cell.isMyCancelledToday && !cell.movedAway) || (cell.isMyFixedSlot && cell.isScheduled)

                return (
                  <button
                    key={di}
                    type="button"
                    disabled={isPending || (!isClickable && !isSelected && !isExtraSelected && !isMoveFrom)}
                    onClick={() => handleCellClick(cell)}
                    title={
                      cell.movedAway
                        ? `${cell.date.slice(8, 10)} — ${displayClassType(cell.typeName)} ${formatTime(hour)} — se la movió el estudio a otro horario`
                        : cell.isMyCancelledToday && mode !== 'extra'
                        ? `${cell.date.slice(8, 10)} — ${displayClassType(cell.typeName)} ${formatTime(hour)} — avisó que no venía: click para deshacer (al final viene, sin cargo)`
                        : `${cell.date.slice(8, 10)} — ${displayClassType(cell.typeName)} ${formatTime(hour)}${
                            cell.isScheduled ? '' : cell.hasRoom ? ' — libre' : ' — completo'
                          }`
                    }
                    className={`h-8 rounded-md border text-[11px] transition ${
                      isSelected || isMoveFrom
                        ? 'border-clay bg-clay text-white animate-pulse'
                        : isExtraSelected
                          ? 'border-clay bg-clay text-white'
                          : cell.isMyCancelledToday && mode !== 'extra'
                            ? 'border-amber-400 bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : cell.isScheduled
                              ? 'border-moss bg-moss text-white'
                              : cell.hasRoom
                                ? isExtraTarget
                                  ? 'border-clay/50 bg-clay/10 text-clay hover:bg-clay/20'
                                  : isValidTarget || (!selection && !(mode === 'swap' && moveFrom && !swapTarget(cell)))
                                    ? 'border-moss/40 bg-moss/10 text-moss hover:bg-moss/20'
                                    : 'border-sand/40 bg-transparent text-ink/15'
                                : 'border-clay/30 bg-clay/5 text-clay/60'
                    } ${isPending ? 'opacity-50' : ''}`}
                  >
                    {isSelected || isMoveFrom
                      ? '↕'
                      : isExtraSelected
                        ? '✓'
                        : cell.isMyCancelledToday && mode !== 'extra'
                          ? '↺'
                          : cell.isScheduled
                            ? '✓'
                            : cell.hasRoom
                              ? '+'
                              : '!'}
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
          Clase agendada (✓)
        </span>
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded border border-moss/40 bg-moss/10" />
          Con lugar (+)
        </span>
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded border border-clay/30 bg-clay/5" />
          Completo (!)
        </span>
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded bg-clay" />
          Seleccionada
        </span>
        <span className="flex items-center gap-1.5 text-ink/60">
          <span className="h-2.5 w-2.5 rounded border border-amber-400 bg-amber-100" />
          Avisó que no viene (↺ click para deshacer, sin cargo)
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
                className="btn-danger flex-1"
              >
                {isPending ? 'Cancelando...' : 'Sí, cancelar'}
              </button>
              <button
                onClick={() => setPendingConfirm(null)}
                className="btn-secondary"
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
