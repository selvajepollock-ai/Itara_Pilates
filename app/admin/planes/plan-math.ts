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

export const CATEGORY_LABEL: Record<string, string> = {
  reformer: 'Pilates',
  fuerza: 'Fuerza',
  ambos: 'Pilates + Fuerza',
}
