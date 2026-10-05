// Fechas del estudio: todo se calcula en hora de Argentina (UTC-3, sin horario de verano),
// no en la del servidor (UTC), para que el día y el mes no cambien 3 horas antes.

const TZ = 'America/Argentina/Buenos_Aires'
export const ART_OFFSET = '-03:00'
const pad = (n: number) => String(n).padStart(2, '0')

/** Hoy en Argentina, "YYYY-MM-DD". */
export function todayART() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/** Primer instante del mes `month` (1 a 12; admite desbordes como 0 o 13) en hora Argentina, listo para consultas por timestamp. */
export function artMonthStart(year: number, month: number) {
  const d = new Date(Date.UTC(year, month - 1, 1))
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-01T00:00:00${ART_OFFSET}`
}

/** Momento exacto en que empieza una clase: la hora de la clase es hora Argentina. */
export function classDateTime(sessionDate: string, startTime: string) {
  return new Date(`${sessionDate}T${startTime.length === 5 ? `${startTime}:00` : startTime}${ART_OFFSET}`)
}
