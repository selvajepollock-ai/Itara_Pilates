import { dayOfMonth } from '../admin/horarios/slots'

const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export const dowOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay()
export const dayName = (dow: number) => DAYS[dow]
export const dayShortName = (dow: number) => DAYS_SHORT[dow]
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
export const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1]

/** "lunes 5" */
export const dayDate = (iso: string) => `${DAYS[dowOf(iso)]} ${dayOfMonth(iso)}`

/** "hoy" o "el miércoles 14" */
export const whenLabel = (iso: string, today: string) => (iso === today ? 'hoy' : `el ${dayDate(iso)}`)

/** "Jueves 8" */
export const dayDateCap = (iso: string) => cap(dayDate(iso))

/** "5 al 9 de octubre" (o con dos meses: "30 de septiembre al 4 de octubre"). */
export function rangeText(from: string, to: string) {
  const sameMonth = from.slice(5, 7) === to.slice(5, 7)
  return sameMonth
    ? `${dayOfMonth(from)} al ${dayOfMonth(to)} de ${monthName(to)}`
    : `${dayOfMonth(from)} de ${monthName(from)} al ${dayOfMonth(to)} de ${monthName(to)}`
}

/** Hora límite para avisar: la clase menos el plazo ("las 16:00"); si cruza la medianoche, se dice el plazo. */
export function deadlineText(start: string, minHours: number) {
  const [h, m] = start.split(':').map(Number)
  const mins = h * 60 + m - Math.round(minHours * 60)
  if (mins < 0) return `${formatHours(minHours)} antes`
  return `las ${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`
}

/** "2 h" / "1,5 h" */
export const formatHours = (h: number) => `${String(h).replace('.', ',')} h`
