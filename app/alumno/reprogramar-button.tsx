'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Clock, MapPin, User } from 'lucide-react'
import { cancelSession } from '@/app/actions/recovery'

type Step = 'idle' | 'confirm' | 'offer' | 'too-late' | 'error'

export function ReprogramarButton({
  studentId,
  enrollmentId,
  classId,
  sessionDate,
  classTypeName,
  dayLabel,
  startTime,
  room,
  instructorName,
  hoursLeft,
  minHours,
}: {
  studentId: string
  enrollmentId: string
  classId: string
  sessionDate: string
  classTypeName: string
  dayLabel: string
  startTime: string
  room: string
  instructorName: string
  hoursLeft: number
  minHours: number
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>('idle')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [recoveryCreditId, setRecoveryCreditId] = useState<string | null>(null)
  const [done, setDone] = useState<'requested-later' | 'no-recovery' | null>(null)

  function close() {
    setStep('idle')
    setError(null)
  }

  function handleConfirmCancel() {
    setError(null)
    startTransition(async () => {
      const res = await cancelSession({ studentId, enrollmentId, classId, sessionDate })
      if (res?.error) {
        setError(res.error)
        setStep('error')
        return
      }
      if (res?.withinDeadline) {
        setRecoveryCreditId(res.recoveryCreditId ?? null)
        setStep('offer')
      } else {
        setStep('too-late')
      }
      router.refresh()
    })
  }

  function handleGoPickSlot() {
    if (recoveryCreditId) router.push(`/alumno/recuperar/${recoveryCreditId}`)
  }

  function handleSkipForNow() {
    setDone('requested-later')
    close()
  }

  if (done === 'requested-later') {
    return <p className="text-xs text-moss-dark">Avisado ✓ — podés elegir el horario nuevo más tarde desde "Recuperaciones".</p>
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setStep('confirm')}
        className="rounded-full border border-clay px-3 py-1.5 text-xs font-medium text-clay transition hover:bg-clay hover:text-white"
      >
        Cancelar clase
      </button>

      {step !== 'idle' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <p className="font-display text-xl italic text-ink">
                {step === 'confirm' && '¿No vas a esta clase?'}
                {step === 'offer' && '¿Buscamos otro horario?'}
                {step === 'too-late' && 'Avisado'}
                {step === 'error' && 'No se pudo avisar'}
              </p>
              <button onClick={close} className="text-ink/40 hover:text-ink">
                <X size={18} />
              </button>
            </div>

            {step === 'confirm' && (
              <>
                <div className="mt-4 space-y-1.5 rounded-xl bg-linen/60 p-3 text-sm text-ink/70">
                  <p className="font-medium text-ink">
                    {classTypeName} · {dayLabel} {startTime}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs">
                    <MapPin size={13} /> {room}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs">
                    <User size={13} /> {instructorName}
                  </p>
                  <p className="flex items-center gap-1.5 text-xs">
                    <Clock size={13} />
                    Te quedan {Math.max(hoursLeft, 0)} hs de anticipación (mínimo {minHours} hs para
                    poder recuperar)
                  </p>
                </div>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={handleConfirmCancel}
                    disabled={isPending}
                    className="flex-1 rounded-full bg-clay px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {isPending ? 'Avisando...' : 'Sí, avisar que no voy'}
                  </button>
                  <button
                    onClick={close}
                    className="rounded-full border border-sand px-4 py-2.5 text-sm font-medium text-ink/60 hover:border-moss hover:text-moss"
                  >
                    Volver
                  </button>
                </div>
              </>
            )}

            {step === 'offer' && (
              <>
                <p className="mt-3 text-sm text-ink/60">
                  Avisado. Como fue con tiempo, podés buscar un horario de{' '}
                  <span className="font-medium text-ink">{classTypeName}</span> para recuperar esta
                  semana — queda sujeto a disponibilidad y a la aprobación del estudio.
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    onClick={handleGoPickSlot}
                    className="flex-1 rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-dark"
                  >
                    Buscar horario
                  </button>
                  <button
                    onClick={handleSkipForNow}
                    className="rounded-full border border-sand px-4 py-2.5 text-sm font-medium text-ink/60 hover:border-moss hover:text-moss"
                  >
                    No por ahora
                  </button>
                </div>
              </>
            )}

            {step === 'too-late' && (
              <>
                <p className="mt-3 text-sm text-ink/60">
                  Avisado. Como fue con tan poca anticipación, no va a ser posible ofrecerte un
                  horario para recuperar esta vez.
                </p>
                <button
                  onClick={() => {
                    setDone('no-recovery')
                    close()
                  }}
                  className="mt-5 w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white hover:bg-moss-dark"
                >
                  Entendido
                </button>
              </>
            )}

            {step === 'error' && (
              <>
                <p className="mt-3 text-sm text-clay">{error}</p>
                <button
                  onClick={close}
                  className="mt-5 w-full rounded-full border border-sand px-4 py-2.5 text-sm font-medium text-ink/60 hover:border-moss hover:text-moss"
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {done === 'no-recovery' && (
        <p className="text-xs text-ink/40">Avisado (sin clase a recuperar).</p>
      )}
    </>
  )
}
