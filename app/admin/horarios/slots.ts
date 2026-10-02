import type { ClassItem, DayColumn, OccurrenceData, Recovering } from './types'

const TZ = 'America/Argentina/Buenos_Aires'
const DAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DAY_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export const dayShort = (dow: number) => DAY_SHORT[dow]
export const dayLong = (dow: number) => DAY_LONG[dow]

export function todayART() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

export function addDaysISO(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function mondayOf(iso: string) {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay()
  return addDaysISO(iso, dow === 0 ? -6 : 1 - dow)
}

export const dayOfMonth = (iso: string) => Number(iso.slice(8, 10))

/** "28 sep – 2 oct 2026" */
export function weekRange(mondayISO: string, days: number) {
  const end = addDaysISO(mondayISO, days - 1)
  const [y, , d1] = mondayISO.split('-').map(Number)
  const [y2, m2, d2] = end.split('-').map(Number)
  const m1 = Number(mondayISO.slice(5, 7))
  const start = m1 === m2 ? `${d1}` : `${d1} ${MONTHS[m1 - 1]}`
  return `${start} – ${d2} ${MONTHS[m2 - 1]} ${y2 === y ? y2 : `${y} – ${y2}`}`
}

/** "29 sep" */
export function dayMonthLabel(iso: string) {
  return `${dayOfMonth(iso)} ${MONTHS[Number(iso.slice(5, 7)) - 1]}`
}

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

export const hourLabel = (hhmm: string) => (hhmm.endsWith(':00') ? `${hhmm.slice(0, 2)} h` : hhmm)

export const occKey = (classId: string, date: string) => `${classId}|${date}`

/** Nombre + inicial del apellido: "Karina H." */
export function shortName(full: string) {
  const parts = full.trim().split(/\s+/)
  if (parts.length < 2) return full
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`
}

/** Fin de semana oculto si no hay clases esos días. */
export function visibleDays(classes: ClassItem[]) {
  const withWeekend = classes.some((c) => c.dow === 6 || c.dow === 0)
  return withWeekend ? [1, 2, 3, 4, 5, 6, 0] : [1, 2, 3, 4, 5]
}

export type GridRow =
  | { kind: 'time'; start: string; classes: Map<number, ClassItem> }
  | { kind: 'gap'; from: string; to: string }

/**
 * Filas de la grilla: una por horario de inicio. Las franjas sin ninguna clase
 * en toda la semana se colapsan en una sola fila ("Sin clases de 11 a 14 h").
 */
export function buildRows(classes: ClassItem[], days: number[]): GridRow[] {
  const byStart = new Map<string, Map<number, ClassItem>>()
  for (const c of classes) {
    if (!days.includes(c.dow)) continue
    if (!byStart.has(c.start)) byStart.set(c.start, new Map())
    byStart.get(c.start)!.set(c.dow, c)
  }
  const starts = [...byStart.keys()].sort()
  const rows: GridRow[] = []
  let maxEnd = 0
  for (const start of starts) {
    if (rows.length > 0 && toMinutes(start) - maxEnd >= 30) {
      const pad = (n: number) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0')
      rows.push({ kind: 'gap', from: pad(maxEnd), to: start })
    }
    rows.push({ kind: 'time', start, classes: byStart.get(start)! })
    for (const c of byStart.get(start)!.values()) maxEnd = Math.max(maxEnd, toMinutes(c.end))
  }
  return rows
}

export function gapLabel(from: string, to: string) {
  const h = (t: string) => (t.endsWith(':00') ? String(Number(t.slice(0, 2))) : t)
  return `Sin clases de ${h(from)} a ${h(to)} h`
}

export type CellInfo = {
  cancelledWhole: boolean
  fixedCount: number
  /** Lugares fijos sin dueño (para anotar a alguien permanente). */
  fixedFree: number
  /** Lugares liberados por cancelación en esa fecha (solo para recuperar). */
  freed: number
  recovering: Recovering[]
  avisaron: string[]
  /** Los que vienen esa fecha: fijos que no avisaron + recuperaciones. */
  attending: number
}

/** Misma cuenta que ya hacía la grilla: liberados = avisaron − recuperaciones. */
export function cellInfo(c: ClassItem, date: string, occ: OccurrenceData): CellInfo {
  const key = occKey(c.id, date)
  const cancelledWhole = occ.wholeCancelled.includes(key)
  const avisaron = occ.cancelled[key] ?? []
  const recovering = occ.recovering[key] ?? []
  const fixedCount = c.fixed.length
  return {
    cancelledWhole,
    fixedCount,
    fixedFree: Math.max(c.capacity - fixedCount, 0),
    freed: cancelledWhole ? 0 : Math.max(avisaron.length - recovering.length, 0),
    recovering: cancelledWhole ? [] : recovering,
    avisaron: cancelledWhole ? [] : avisaron,
    attending: cancelledWhole ? 0 : fixedCount - avisaron.length + recovering.length,
  }
}

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

export function buildColumns(monday: string, days: number[], holidays: Record<string, string>): DayColumn[] {
  return days.map((dow) => {
    const date = addDaysISO(monday, dow === 0 ? 6 : dow - 1)
    return { dow, date, holiday: holidays[date] ?? null }
  })
}
