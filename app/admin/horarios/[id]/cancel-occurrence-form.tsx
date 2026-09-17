'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarOff, RotateCcw } from 'lucide-react'
import { cancelClassOccurrence, uncancelClassOccurrence } from '@/app/actions/recovery'
import { InfoHint } from '@/app/components/info-hint'

type CancelledDate = {
  session_date: string
  reason: string | null
}

export function CancelOccurrenceForm({
  classId,
  cancelledDates,
}: {
  classId: string
  cancelledDates: CancelledDate[]
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [date, setDate] = useState('')
  const [reason, setReason] = useState('')

  function handleCancel(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!date) {
      setError('Elegí una fecha.')
      return
    }
    startTransition(async () => {
      const result = await cancelClassOccurrence({ classId, sessionDate: date, reason: reason || undefined })
      if (result?.error) {
        setError(result.error)
        return
      }
      setSuccess('Clase cancelada. Se avisó y se generó recuperación a los anotados.')
      setDate('')
      setReason('')
      router.refresh()
    })
  }

  function handleUncancel(sessionDate: string) {
    setError(null)
    setSuccess(null)
    startTransition(async () => {
      const result = await uncancelClassOccurrence({ classId, sessionDate })
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-8 rounded-2xl border border-sand bg-white p-5">
      <h2 className="section-title flex items-center gap-1.5">
        <CalendarOff size={14} strokeWidth={2} />
        Cancelar una fecha puntual
        <InfoHint text="Cancela esta clase para un día específico (ej: no hay instructor). No afecta las demás semanas. Los anotados reciben aviso y recuperación automática." />
      </h2>

      <form onSubmit={handleCancel} className="mt-3 flex flex-wrap items-end gap-2">
        <div>
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1.5 rounded-lg border border-sand bg-linen/40 px-3 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="text-xs font-medium uppercase tracking-wide text-ink/60">Motivo (opcional)</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ej: instructor con licencia"
            className="mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3 py-2 text-sm text-ink outline-none focus:border-moss focus:bg-white"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="btn-danger"
        >
          {isPending ? 'Cancelando...' : 'Cancelar esa fecha'}
        </button>
      </form>

      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
      {success && <p className="mt-2 text-sm text-moss-dark">{success}</p>}

      {cancelledDates.length > 0 && (
        <div className="mt-4 border-t border-sand pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Fechas canceladas</p>
          <ul className="mt-2 space-y-1.5">
            {cancelledDates.map((c) => (
              <li
                key={c.session_date}
                className="flex items-center justify-between rounded-lg bg-clay/5 px-3 py-2 text-sm"
              >
                <span className="text-ink">
                  {new Date(`${c.session_date}T00:00:00`).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'long',
                  })}
                  {c.reason && <span className="text-ink/50"> — {c.reason}</span>}
                </span>
                <button
                  onClick={() => handleUncancel(c.session_date)}
                  disabled={isPending}
                  className="flex items-center gap-1 text-xs text-ink/50 hover:text-moss disabled:opacity-50"
                >
                  <RotateCcw size={12} />
                  Deshacer
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
