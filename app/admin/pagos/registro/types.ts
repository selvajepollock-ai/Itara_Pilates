export type Tipo = 'cuota' | 'suelta'

/** Un cobro del registro: una cuota (payments) o una clase suelta pagada (extra_charges). */
export type RegistroRow = {
  id: string
  kind: Tipo
  /** Día del cobro en hora Argentina (YYYY-MM-DD). */
  date: string
  /** Timestamp original, para ordenar dentro del día y para editar. */
  paidAt: string
  studentId: string | null
  studentName: string
  /** Plan (cuota) o descripción (suelta). */
  concept: string
  note: string
  amount: number
  /** Solo las cuotas guardan quién las registró (las sueltas no). */
  recordedById: string | null
  recordedByName: string | null
  voided: boolean
  voidedReason: string
}
