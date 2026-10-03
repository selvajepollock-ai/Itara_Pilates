'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelSession } from '@/app/actions/recovery'
import { useSidePanel } from '@/app/components/use-side-panel'
import type { AvoidInfo } from './types'

/** Confirmación de "Avisar que no voy": modal en escritorio, hoja inferior en celular. Usa la acción cancelSession de siempre. */
export function AvoidDialog({
  info,
  studentId,
  minHoursText,
  onClose,
}: {
  info: AvoidInfo
  studentId: string
  /** "2 h" (sale de la configuración del estudio). */
  minHoursText: string
  onClose: () => void
}) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  useSidePanel(panelRef, { isMobile: true, onClose, resetKey: `${info.enrollmentId}|${info.sessionDate}` })
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function confirmAvoid() {
    setError(null)
    startTransition(async () => {
      const res = await cancelSession({
        studentId,
        enrollmentId: info.enrollmentId,
        classId: info.classId,
        sessionDate: info.sessionDate,
      })
      if (res?.error) {
        setError(res.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 cursor-default bg-ink/30" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Avisar que no voy"
        tabIndex={-1}
        className="relative w-full max-w-[460px] rounded-t-[22px] bg-white p-6 pb-[calc(24px+env(safe-area-inset-bottom))] outline-none sm:rounded-[22px]"
      >
        <h2 className="font-display text-2xl font-normal italic leading-tight text-ink">
          ¿No vas {info.whenLabel} a las {info.start}?
        </h2>

        {info.onTime ? (
          <>
            <p className="mt-4 rounded-[12px] bg-moss-soft px-4 py-3 text-sm text-[#2F4A36]">
              Estás a tiempo: tu lugar se libera y ganás <strong>una recuperación hasta el {info.creditUntil}</strong>, en otra
              clase de {info.typeName} con tu profesor.
            </p>
            <p className="mt-3 text-[13px] text-muted">
              Si avisás con menos de {minHoursText} de anticipación, el lugar se libera igual pero no hay recuperación.
            </p>
          </>
        ) : (
          <p className="mt-4 rounded-[12px] bg-[#FDF6E1] px-4 py-3 text-sm text-slot-freed-ink">
            Faltan menos de {minHoursText}: tu lugar se libera pero <strong>no vas a poder recuperar</strong> esta clase.
          </p>
        )}

        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        <div className="mt-6 flex gap-2.5">
          <button type="button" onClick={onClose} className="btn-secondary h-11 flex-1 justify-center">
            Volver
          </button>
          <button
            type="button"
            onClick={confirmAvoid}
            disabled={isPending}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-[12px] bg-[#2B2A26] px-4 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-50"
          >
            {isPending ? 'Avisando...' : 'Sí, aviso que no voy'}
          </button>
        </div>
      </div>
    </div>
  )
}
