'use client'
import { useState, useTransition } from 'react'
import { formatARS } from '@/lib/currency'
import { todayART } from '@/lib/dates'
import type { DropInTiers } from '@/lib/drop-in-prices'
import { monthLabel, priceMonthOptions, shortDate } from '../planes/plan-math'
import { cancelScheduledDropIn, updateStudioSettings } from './actions'
type TierKey = 1 | 2 | 3 | 4
const TIERS: { key: TierKey; name: string; label: string }[] = [
  { key: 1, name: 'drop_in_price_1', label: '1 clase (ARS)' },
  { key: 2, name: 'drop_in_price_2', label: '2 clases — c/u (ARS)' },
  { key: 3, name: 'drop_in_price_3', label: '3 clases — c/u (ARS)' },
  { key: 4, name: 'drop_in_price_4_plus', label: '4 o más — c/u (ARS)' },
]
const TIER_SHORT: Record<TierKey, string> = { 1: '1 clase', 2: '2 clases', 3: '3 clases', 4: '4 o más' }
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
  const [saved, setSaved] = useState<string | null>(null)
  const monthOptions = priceMonthOptions(todayART())
  const current: DropInTiers = {
    1: settings.drop_in_price_1,
    2: settings.drop_in_price_2,
    3: settings.drop_in_price_3,
    4: settings.drop_in_price_4_plus,
  }
  const [validFrom, setValidFrom] = useState(upcomingDropIn?.validFrom ?? monthOptions[1])
  // Si ya hay un aumento programado, se muestran esos precios para poder corregirlos.
  const initial = upcomingDropIn?.tiers ?? current
  const [prices, setPrices] = useState<Record<TierKey, string>>({
    1: String(initial[1]),
    2: String(initial[2]),
    3: String(initial[3]),
    4: String(initial[4]),
  })
  // Lo que cambia respecto de lo que se cobra hoy.
  const changes = TIERS.filter((t) => Number(prices[t.key]) !== current[t.key])
  const startsNow = validFrom === monthOptions[0]

  function cancelUpcoming() {
    if (!upcomingDropIn) return
    if (!confirm(`¿Cancelar los precios de sueltas desde el ${shortDate(upcomingDropIn.validFrom)}? Siguen los actuales.`)) return
    setError(null)
    setSaved(null)
    startTransition(async () => {
      const result = await cancelScheduledDropIn(upcomingDropIn.validFrom)
      if (result?.error) {
        setError(result.error)
        return
      }
      setPrices({ 1: String(current[1]), 2: String(current[2]), 3: String(current[3]), 4: String(current[4]) })
      setSaved('Aumento cancelado: siguen los precios actuales.')
    })
  }
  function handleSubmit(formData: FormData) {
    setError(null)
    setSaved(null)
    // Se arma el mensaje antes de guardar, con lo que se ve en pantalla.
    const message =
      changes.length === 0
        ? 'Guardado ✓'
        : startsNow
          ? `Guardado ✓ Los precios de sueltas nuevos ya rigen (clases de ${monthLabel(validFrom)} en adelante).`
          : `Guardado ✓ Los precios de sueltas nuevos rigen desde el ${shortDate(validFrom)}. Hasta entonces se cobran los actuales.`
    startTransition(async () => {
      const result = await updateStudioSettings(formData)
      if (result?.error) {
        setError(result.error)
        return
      }
      setSaved(message)
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
          {TIERS.map((t) => (
            <div key={t.key}>
              <label htmlFor={t.name} className={labelClass}>
                {t.label}
              </label>
              <input
                id={t.name}
                type="number"
                name={t.name}
                min={0}
                step="0.01"
                value={prices[t.key]}
                onChange={(e) => setPrices((p) => ({ ...p, [t.key]: e.target.value }))}
                className={inputClass}
              />
              <p className="mt-1 text-xs tabular-nums text-ink/40">Hoy: {formatARS(current[t.key])}</p>
            </div>
          ))}
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
        </div>
        {/* Lo que se va a guardar, con el precio de hoy y el nuevo, solo de lo que cambia. */}
        {changes.length > 0 ? (
          <div className="mt-3 rounded-lg bg-moss/5 px-3.5 py-2.5 text-xs text-ink">
            <p className="font-medium">
              {startsNow
                ? `Vas a guardar (rige ya, para las clases de ${monthLabel(validFrom)} en adelante):`
                : `Vas a guardar (rige desde el ${shortDate(validFrom)}; hasta entonces se cobra el precio de hoy):`}
            </p>
            <ul className="mt-1 space-y-0.5 tabular-nums">
              {changes.map((t) => (
                <li key={t.key}>
                  {TIER_SHORT[t.key]}: {formatARS(current[t.key])} → {formatARS(Number(prices[t.key]))}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-ink/50">Se cobra según la fecha de la clase. Las clases ya cargadas no cambian.</p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink/40">Los precios son los de hoy: no hay cambios para guardar.</p>
        )}
        {upcomingDropIn && (
          <div className="mt-3 rounded-lg border border-sand px-3.5 py-2.5 text-xs text-ink">
            <p>Hay un aumento programado desde el {shortDate(upcomingDropIn.validFrom)} (son los valores de arriba).</p>
            <button type="button" onClick={cancelUpcoming} disabled={isPending} className="mt-1 font-medium text-clay hover:underline">
              Cancelar el aumento
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}
      {saved && <p className="text-sm text-moss-dark">{saved}</p>}
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
