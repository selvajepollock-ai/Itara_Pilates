import { addDaysISO, dayOfMonth } from '../horarios/slots'

export type PeriodKey = 'mes' | 'anterior' | '3m' | 'anio' | 'custom'
export type Granularity = 'day' | 'week' | 'month'

export type Period = {
  key: PeriodKey
  from: string
  to: string
  prevFrom: string
  prevTo: string
  /** "septiembre" si el período anterior es un mes; si no, "el período anterior". */
  prevLabel: string
  granularity: Granularity
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const pad = (n: number) => String(n).padStart(2, '0')
const firstOf = (y: number, m: number) => `${y}-${pad(m)}-01`
const lastOf = (y: number, m: number) => `${y}-${pad(m)}-${pad(new Date(Date.UTC(y, m, 0)).getUTCDate())}`
/** Suma `n` meses a (y, m) (m = 1..12). */
function shiftMonth(y: number, m: number, n: number) {
  const d = new Date(Date.UTC(y, m - 1 + n, 1))
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 }
}
const isDate = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
const daysBetween = (a: string, b: string) =>
  Math.round((new Date(`${b}T12:00:00Z`).getTime() - new Date(`${a}T12:00:00Z`).getTime()) / 86_400_000) + 1

/** Resuelve el período elegido (por `periodo` o por `desde`/`hasta`) y el período anterior de igual duración. */
export function resolvePeriod(params: { periodo?: string; desde?: string; hasta?: string }, today: string): Period {
  const y = Number(today.slice(0, 4))
  const m = Number(today.slice(5, 7))

  if (isDate(params.desde) && isDate(params.hasta) && params.desde! <= params.hasta!) {
    const len = daysBetween(params.desde!, params.hasta!)
    return {
      key: 'custom',
      from: params.desde!,
      to: params.hasta!,
      prevFrom: addDaysISO(params.desde!, -len),
      prevTo: addDaysISO(params.desde!, -1),
      prevLabel: 'el período anterior',
      granularity: len > 120 ? 'month' : len > 45 ? 'week' : 'day',
    }
  }

  const monthPeriod = (key: PeriodKey, cur: { y: number; m: number }): Period => {
    const prev = shiftMonth(cur.y, cur.m, -1)
    return {
      key,
      from: firstOf(cur.y, cur.m),
      to: lastOf(cur.y, cur.m),
      prevFrom: firstOf(prev.y, prev.m),
      prevTo: lastOf(prev.y, prev.m),
      prevLabel: MONTHS[prev.m - 1],
      granularity: 'day',
    }
  }

  switch (params.periodo) {
    case 'anterior':
      return monthPeriod('anterior', shiftMonth(y, m, -1))
    case '3m': {
      const start = shiftMonth(y, m, -2)
      const prevStart = shiftMonth(y, m, -5)
      const prevEnd = shiftMonth(y, m, -3)
      return {
        key: '3m',
        from: firstOf(start.y, start.m),
        to: lastOf(y, m),
        prevFrom: firstOf(prevStart.y, prevStart.m),
        prevTo: lastOf(prevEnd.y, prevEnd.m),
        prevLabel: 'los 3 meses anteriores',
        granularity: 'week',
      }
    }
    case 'anio':
      return {
        key: 'anio',
        from: `${y}-01-01`,
        to: `${y}-12-31`,
        prevFrom: `${y - 1}-01-01`,
        prevTo: `${y - 1}-12-31`,
        prevLabel: String(y - 1),
        granularity: 'month',
      }
    default:
      return monthPeriod('mes', { y, m })
  }
}

/** "1 – 31 oct 2026" */
export function rangeLabel(from: string, to: string) {
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const end = `${td} ${SHORT[tm - 1]} ${ty}`
  if (fy === ty && fm === tm) return `${fd} – ${end}`
  if (fy === ty) return `${fd} ${SHORT[fm - 1]} – ${end}`
  return `${fd} ${SHORT[fm - 1]} ${fy} – ${end}`
}

/** Variación porcentual entre el período actual y el anterior; null si no hay con qué comparar. */
export function variation(current: number, previous: number) {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export type Bucket = { key: string; label: string; total: number; count: number; future: boolean }

/** Agrupa pagos por día, semana (lunes) o mes. Solo presentación sobre los pagos ya cargados. */
export function buildBuckets(
  entries: { date: string; amount: number }[],
  period: Period,
  today: string
): Bucket[] {
  const sums = new Map<string, { total: number; count: number }>()
  const keyOf = (date: string): string => {
    if (period.granularity === 'month') return date.slice(0, 7)
    if (period.granularity === 'week') {
      const dow = new Date(`${date}T12:00:00Z`).getUTCDay()
      return addDaysISO(date, dow === 0 ? -6 : 1 - dow)
    }
    return date
  }
  for (const e of entries) {
    const k = keyOf(e.date)
    const cur = sums.get(k) ?? { total: 0, count: 0 }
    cur.total += e.amount
    cur.count += 1
    sums.set(k, cur)
  }

  const buckets: Bucket[] = []
  const seen = new Set<string>()
  for (let d = period.from; d <= period.to; d = addDaysISO(d, 1)) {
    const k = keyOf(d)
    if (seen.has(k)) continue
    seen.add(k)
    const s = sums.get(k) ?? { total: 0, count: 0 }
    const label =
      period.granularity === 'month'
        ? `${MONTHS[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`
        : period.granularity === 'week'
          ? `Semana del ${dayOfMonth(k)} ${SHORT[Number(k.slice(5, 7)) - 1]}`
          : `${dayOfMonth(k)} ${SHORT[Number(k.slice(5, 7)) - 1]}`
    buckets.push({ key: k, label, total: s.total, count: s.count, future: k > today })
  }
  return buckets
}
