'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useSearchParams } from 'next/navigation'

/** Selector de mes en es-AR ("Octubre 2026"). Cambia el parámetro de la URL y recarga los datos. */
export function MonthPicker({
  param,
  value,
  currentMonth,
  clear = [],
}: {
  /** Nombre del parámetro: `month` (Resumen, Liquidación) o `mes` (Registro). */
  param: string
  value: string
  currentMonth: string
  /** Parámetros que se descartan al cambiar de mes (ej: `dia`). */
  clear?: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Los últimos 24 meses hasta el actual (y el elegido, si fuera otro).
  const [cy, cm] = currentMonth.split('-').map(Number)
  const options: string[] = []
  for (let i = 0; i < 24; i++) {
    const d = new Date(Date.UTC(cy, cm - 1 - i, 1))
    options.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  if (!options.includes(value)) options.push(value)

  function onChange(next: string) {
    const qs = new URLSearchParams(searchParams.toString())
    qs.set(param, next)
    for (const k of clear) qs.delete(k)
    router.push(`${pathname}?${qs.toString()}`)
  }

  return (
    <label className="inline-flex items-center">
      <span className="sr-only">Mes</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-[12px] border border-edge-strong bg-white px-3 text-sm font-medium text-ink outline-none transition focus:border-moss"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {monthLabel(o)}
          </option>
        ))}
      </select>
    </label>
  )
}
