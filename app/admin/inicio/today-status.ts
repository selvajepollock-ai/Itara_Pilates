'use client'

import { useEffect, useState } from 'react'

const TZ = 'America/Argentina/Buenos_Aires'

export type TodayClass = {
  id: string
  name: string
  /** 'HH:MM' */
  start: string
  end: string
  enrolled: number
  capacity: number
  cancelled: boolean
}

export type ClassState = 'cancelada' | 'finalizada' | 'en_curso' | 'proxima' | 'completa' | 'programada'

export type DerivedClass = TodayClass & { state: ClassState; minutesToStart: number }

export function toMinutes(hhmm: string) {
  const [h, m] = hhmm.slice(0, 5).split(':').map(Number)
  return h * 60 + m
}

/** Minutos desde medianoche, en hora argentina (no depende de la zona del dispositivo). */
export function minutesNowArgentina(date: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0)
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0)
  return h * 60 + m
}

/**
 * Estado visual de cada clase según la hora actual. Es lógica de presentación pura:
 * no consulta nada, solo ordena y etiqueta lo que el servidor ya cargó.
 * `nowMin === null` (antes de montar) deja todo como "programada".
 */
export function deriveClasses(classes: TodayClass[], nowMin: number | null): DerivedClass[] {
  const sorted = [...classes].sort((a, b) => toMinutes(a.start) - toMinutes(b.start))
  let nextAssigned = false

  return sorted.map((c) => {
    const start = toMinutes(c.start)
    const end = toMinutes(c.end)
    const minutesToStart = nowMin === null ? 0 : start - nowMin
    const isFull = c.capacity > 0 && c.enrolled >= c.capacity

    let state: ClassState
    if (c.cancelled) state = 'cancelada'
    else if (nowMin === null) state = isFull ? 'completa' : 'programada'
    else if (nowMin >= end) state = 'finalizada'
    else if (nowMin >= start) state = 'en_curso'
    else if (!nextAssigned) {
      nextAssigned = true
      state = 'proxima'
    } else state = isFull ? 'completa' : 'programada'

    return { ...c, state, minutesToStart }
  })
}

/** Reloj que se actualiza cada 30 s. Devuelve null hasta que el componente monta. */
export function useNowMinutes() {
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    setNow(minutesNowArgentina())
    const id = setInterval(() => setNow(minutesNowArgentina()), 30_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function formatMinutesToStart(min: number) {
  if (min < 60) return `En ${Math.max(min, 1)} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m === 0 ? `En ${h} h` : `En ${h} h ${m} min`
}
