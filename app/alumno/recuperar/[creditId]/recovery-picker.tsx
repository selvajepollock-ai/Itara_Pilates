'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { bookRecovery } from '@/app/actions/recovery'

export type PickerOption = { classId: string; time: string; places: number }
export type PickerDay = { date: string; title: string; options: PickerOption[] }

type Selected = { classId: string; date: string; label: string }

/** Elegir clase para recuperar: horarios por día, barra fija con la elección y tarjeta final de "Esperando aprobación". */
export function RecoveryPicker({
  days,
  studentId,
  creditId,
  pendingLabel,
}: {
  days: PickerDay[]
  studentId: string
  creditId: string
  /** Si el crédito ya tiene un pedido pendiente: "el jueves 15 a las 15:00". */
  pendingLabel?: string
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<Selected | null>(null)
  const [sentLabel, setSentLabel] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)

  if (sentLabel) {
    return (
      <div className="rounded-2xl border border-[#DCE7DE] bg-moss-soft p-6">
        <span className="rounded-full bg-slot-free px-2.5 py-0.5 text-[11px] font-semibold text-slot-free-ink">Confirmada</span>
        <p className="mt-3 font-display text-2xl italic text-ink">Listo, te esperamos {sentLabel}</p>
        <p className="mt-2 text-sm text-muted">
          Tu recuperación quedó confirmada. La vas a ver en "Tus clases". Si no podés ir, avisá con tiempo desde tu panel.
        </p>
        <Link
          href="/alumno"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2B2A26] px-5 text-sm font-semibold text-white hover:bg-black max-sm:w-full"
        >
          Volver a Inicio
        </Link>
      </div>
    )
  }

  const shownLabel = pendingLabel ?? null
  if (shownLabel) {
    return (
      <div className="rounded-2xl border border-[#F0E3C4] bg-[#FDF8EE] p-6">
        <span className="rounded-full bg-slot-freed px-2.5 py-0.5 text-[11px] font-semibold text-slot-freed-ink">
          Esperando aprobación
        </span>
        <p className="mt-3 font-display text-2xl italic text-ink">Pediste {shownLabel}</p>
        <p className="mt-2 text-sm text-muted">
          El estudio lo tiene que aprobar. Vas a ver la respuesta en tu panel: si lo aprueban, la clase aparece en
          &quot;Tus clases&quot;; si no, tu recuperación vuelve a estar disponible para que elijas otro horario.
        </p>
        <Link
          href="/alumno"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2B2A26] px-5 text-sm font-semibold text-white hover:bg-black max-sm:w-full"
        >
          Volver a Inicio
        </Link>
      </div>
    )
  }

  function submit() {
    if (!selected) return
    setError(null)
    setConfirming(false)
    startTransition(async () => {
      const res = await bookRecovery({ studentId, creditId, classId: selected.classId, sessionDate: selected.date })
      if (res?.error) {
        setError(res.error)
        return
      }
      setSentLabel(selected.label)
      router.refresh()
    })
  }

  if (days.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-edge-strong px-5 py-8 text-center text-sm text-muted">
        No quedan clases con lugar esta semana. Mantenés tu recuperación hasta el viernes y te avisamos apenas se libere un lugar.
      </p>
    )
  }

  return (
    <div className={selected ? 'pb-28' : ''}>
      <div className="space-y-6">
        {days.map((d) => (
          <section key={d.date}>
            <h2 className="text-[15px] font-semibold text-ink">{d.title}</h2>
            <div className="mt-2 grid grid-cols-3 gap-2.5 sm:flex sm:flex-wrap">
              {d.options.map((o) => {
                const active = selected?.classId === o.classId && selected.date === d.date
                return (
                  <button
                    key={o.classId}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      setSelected({ classId: o.classId, date: d.date, label: `el ${d.title.toLowerCase()} a las ${o.time}` })
                    }
                    className={`flex h-[68px] flex-col items-center justify-center rounded-[14px] border transition sm:w-[120px] ${
                      active ? 'border-moss bg-moss text-white' : 'border-edge-strong bg-white text-ink hover:border-moss'
                    }`}
                  >
                    <span className="text-lg font-semibold tabular-nums">{o.time}</span>
                    <span className={`text-xs font-medium ${active ? 'text-white/90' : 'text-state-ok-ink'}`}>
                      {o.places === 1 ? '1 lugar' : `${o.places} lugares`}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {confirming && selected && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Confirmar recuperación">
          <button type="button" aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 cursor-default bg-ink/30" onClick={() => setConfirming(false)} />
          <div className="relative w-full max-w-[420px] rounded-t-[22px] bg-white p-6 pb-[calc(24px+env(safe-area-inset-bottom))] sm:rounded-[22px]">
            <h2 className="font-display text-2xl italic leading-tight text-ink">¿Confirmás esta recuperación?</h2>
            <p className="mt-3 rounded-[12px] bg-moss-soft px-4 py-3 text-sm text-[#2F4A36]">
              Vas a recuperar <strong>{selected.label}</strong>. Queda confirmada al instante y tu lugar queda reservado.
            </p>
            <p className="mt-3 text-[13px] text-muted">Si después no podés ir, podés cancelarla con anticipación y no la perdés.</p>
            <div className="mt-6 flex gap-2.5">
              <button type="button" onClick={() => setConfirming(false)} className="btn-secondary h-11 flex-1 justify-center">
                Volver
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={isPending}
                className="inline-flex h-11 flex-1 items-center justify-center rounded-[12px] bg-[#2B2A26] px-4 text-sm font-semibold text-white hover:bg-black disabled:opacity-50"
              >
                {isPending ? 'Confirmando...' : 'Sí, confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-white px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(43,42,38,0.08)]">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 sm:px-4">
            <p className="text-sm text-ink">
              Vas a recuperar <span className="font-semibold">{selected.label}</span>
            </p>
            <div className="flex items-center gap-3 max-sm:w-full max-sm:flex-col">
              {error && <p className="text-sm text-danger">{error}</p>}
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={isPending}
                className="inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2B2A26] px-6 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 max-sm:w-full"
              >
                {isPending ? 'Confirmando...' : 'Elegir esta clase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

