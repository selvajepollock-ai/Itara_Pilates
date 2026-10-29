'use client'
import { useState, useTransition } from 'react'
import { formatARS } from '@/lib/currency'
import { todayART } from '@/lib/dates'
import type { DropInTiers } from '@/lib/drop-in-prices'
import { monthLabel, priceMonthOptions, shortDate } from '../planes/plan-math'
import { cancelScheduledDropIn, updateStudioSettings } from './actions'
type Settings = {
  cancellation_min_hours: number
  payment_due_day: number
  payment_reminder_days_before: number
  drop_in_price_1: number
  drop_in_price_2: number
  drop_in_price_3: number
  drop_in_price_4_plus: number
}
export function StudioSettingsForm({
  settings,
  upcomingDropIn,
}: {
  /** Precios de sueltas vigentes hoy. */
  settings: Settings
  /** Aumento de sueltas ya cargado que todavía no rige. */
  upcomingDropIn: { validFrom: string; tiers: DropInTiers } | null
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const monthOptions = priceMonthOptions(todayART())
  const [validFrom, setValidFrom] = useState(upcomingDropIn?.validFrom ?? monthOptions[1])
  // Si ya hay un aumento programado, se muestran esos precios para poder corregirlos.
  const shown: DropInTiers = upcomingDropIn
    ? upcomingDropIn.tiers
    : { 1: settings.drop_in_price_1, 2: settings.drop_in_price_2, 3: settings.drop_in_price_3, 4: settings.drop_in_price_4_plus }

  function cancelUpcoming() {
    if (!upcomingDropIn) return
    if (!confirm(`¿Cancelar los precios de sueltas desde el ${shortDate(upcomingDropIn.validFrom)}? Siguen los actuales.`)) return
    setError(null)
    startTransition(async () => {
      const result = await cancelScheduledDropIn(upcomingDropIn.validFrom)
      if (result?.error) setError(result.error)
    })
  }
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

      <div className="border-t border-sand pt-5">
        <p className="text-sm font-medium text-ink">Precios de clases sueltas (sin plan)</p>
        <p className="mt-1 text-xs text-ink/40">
          Solo aplica a alumnos sin plan mensual. El precio depende de cuántas clases compran juntas
          en la misma tanda — si compran por separado, cada tanda vuelve a arrancar en el precio de 1.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>1 clase (ARS)</label>
            <input
              type="number"
              name="drop_in_price_1"
              min={0}
              step="0.01"
              defaultValue={shown[1]}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>2 clases — c/u (ARS)</label>
            <input
              type="number"
              name="drop_in_price_2"
              min={0}
              step="0.01"
              defaultValue={shown[2]}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>3 clases — c/u (ARS)</label>
            <input
              type="number"
              name="drop_in_price_3"
              min={0}
              step="0.01"
              defaultValue={shown[3]}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>4 o más — c/u (ARS)</label>
            <input
              type="number"
              name="drop_in_price_4_plus"
              min={0}
              step="0.01"
              defaultValue={shown[4]}
              className={inputClass}
            />
          </div>
        </div>
        <div className="mt-3">
          <label htmlFor="drop-in-valid-from" className={labelClass}>
            Estos precios rigen desde
          </label>
          <select
            id="drop-in-valid-from"
            name="drop_in_valid_from"
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
            className={inputClass}
          >
            {monthOptions.map((d, i) => (
              <option key={d} value={d}>
                1° de {monthLabel(d)}
                {i === 0 ? ' (este mes)' : ''}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-ink/40">
            Las clases de {monthLabel(validFrom)} en adelante se cobran a estos precios, aunque se compren antes. Lo que ya
            está cargado no cambia.
          </p>
        </div>
        {upcomingDropIn && (
          <div className="mt-3 rounded-lg border border-sand px-3.5 py-2.5 text-xs text-ink">
            <p>
              Hoy: {formatARS(settings.drop_in_price_1)} · {formatARS(settings.drop_in_price_2)} ·{' '}
              {formatARS(settings.drop_in_price_3)} · {formatARS(settings.drop_in_price_4_plus)}. Arriba están los precios
              programados desde el {shortDate(upcomingDropIn.validFrom)}.
            </p>
            <button type="button" onClick={cancelUpcoming} disabled={isPending} className="mt-1 font-medium text-clay hover:underline">
              Cancelar el aumento
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}
      {saved && <p className="text-sm text-moss-dark">Guardado ✓</p>}
      <button
        type="submit"
        disabled={isPending}
        className="btn-primary"
      >
        {isPending ? 'Guardando...' : 'Guardar configuración'}
      </button>
    </form>
  )
}
