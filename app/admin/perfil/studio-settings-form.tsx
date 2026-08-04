'use client'

import { useState, useTransition } from 'react'
import { updateStudioSettings } from './actions'

type Settings = {
  cancellation_min_hours: number
  payment_due_day: number
  payment_reminder_days_before: number
  drop_in_class_price: number
}

export function StudioSettingsForm({ settings }: { settings: Settings }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSubmit(formData: FormData) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateStudioSettings(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(true)
    })
  }

  const inputClass =
    'mt-1.5 w-full rounded-lg border border-sand bg-linen/40 px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-moss focus:bg-white'
  const labelClass = 'text-xs font-medium uppercase tracking-wide text-ink/60'

  return (
    <form action={handleSubmit} className="mt-6 space-y-5 rounded-2xl border border-sand bg-white p-6">
      <div>
        <label className={labelClass}>Cancelación mínima antes de la clase (horas)</label>
        <input
          type="number"
          name="cancellation_min_hours"
          min={0}
          defaultValue={settings.cancellation_min_hours}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink/40">
          Con menos aviso que esto, el alumno pierde la clase sin recuperación.
        </p>
      </div>

      <div>
        <label className={labelClass}>Día de vencimiento mensual</label>
        <input
          type="number"
          name="payment_due_day"
          min={1}
          max={28}
          defaultValue={settings.payment_due_day}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink/40">Mismo día para todos los alumnos, cada mes.</p>
      </div>

      <div>
        <label className={labelClass}>Avisar cuota por vencer con anticipación (días)</label>
        <input
          type="number"
          name="payment_reminder_days_before"
          min={0}
          defaultValue={settings.payment_reminder_days_before}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass}>Precio de clase suelta / extra (ARS)</label>
        <input
          type="number"
          name="drop_in_class_price"
          min={0}
          step="0.01"
          defaultValue={settings.drop_in_class_price}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-ink/40">
          Se usa cuando agregás una clase extra paga a un alumno, fuera de su plan fijo.
        </p>
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}
      {saved && <p className="text-sm text-moss-dark">Guardado ✓</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
      >
        {isPending ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </form>
  )
}
