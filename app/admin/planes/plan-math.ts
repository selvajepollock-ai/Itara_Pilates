export type PlanItem = {
  id: string
  name: string
  price: number
  active: boolean
  category: string
  classesPerWeek: number | null
  /** Alumnos activos con este plan (incluye bonificados). */
  students: number
  /** Alumnos activos con este plan, sin bonificados. */
  paying: number
  /** Aumento ya cargado que todavía no rige (el más próximo). */
  upcoming: { price: number; validFrom: string } | null
  /** Precios cargados, del más reciente al más viejo. */
  history: { price: number; validFrom: string }[]
}

/** Precio por clase: mensualidad ÷ (clases por semana × 4 semanas). Solo para mostrar. */
export function pricePerClass(price: number, classesPerWeek: number | null) {
  if (!classesPerWeek || classesPerWeek <= 0) return null
  return price / (classesPerWeek * 4)
}

/** Por clases por semana (ascendente); los planes sin clases por semana van primero. */
export function sortPlans<T extends { classesPerWeek: number | null; price: number }>(plans: T[]) {
  return [...plans].sort((a, b) => (a.classesPerWeek ?? 0) - (b.classesPerWeek ?? 0) || a.price - b.price)
}

/** "2026-11-01" → "noviembre 2026". */
export function monthLabel(isoDate: string) {
  return new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${isoDate}T12:00:00Z`))
}

/** "2026-11-01" → "1/11". */
export function shortDate(isoDate: string) {
  const [, m, d] = isoDate.split('-').map(Number)
  return `${d}/${m}`
}

export const CATEGORY_LABEL: Record<string, string> = {
  reformer: 'Pilates',
  fuerza: 'Fuerza',
  ambos: 'Pilates + Fuerza',
}
