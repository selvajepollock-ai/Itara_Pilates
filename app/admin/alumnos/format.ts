const TZ = 'America/Argentina/Buenos_Aires'
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

/** Fecha corta es-AR: "4 sep". Si es de otro año, se agrega: "4 sep 2025". Acepta fecha o timestamp. */
export function shortDate(value: string | null) {
  if (!value) return null
  const isDateOnly = value.length === 10
  const d = isDateOnly ? new Date(`${value}T12:00:00Z`) : new Date(value)
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: isDateOnly ? 'UTC' : TZ,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(d)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const nowYear = Number(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric' }).format(new Date()))
  const base = `${get('day')} ${MONTHS[get('month') - 1]}`
  return get('year') === nowYear ? base : `${base} ${get('year')}`
}

export function addDays(isoDate: string, n: number) {
  const d = new Date(`${isoDate}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** "1/10" (día/mes, nunca mm/dd). */
export function dayMonth(isoDate: string) {
  const [, m, d] = isoDate.split('-').map(Number)
  return `${d}/${m}`
}

export function normalize(text: string) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
