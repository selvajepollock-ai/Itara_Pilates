export type AvoidInfo = {
  enrollmentId: string
  classId: string
  sessionDate: string
  typeName: string
  /** "hoy" o "el miércoles 14" */
  whenLabel: string
  start: string
  /** Si faltan más horas que el plazo (mismo criterio que usa la acción). */
  onTime: boolean
  /** "viernes 9": hasta cuándo sirve la recuperación que se gana. */
  creditUntil: string
}

export type ClassState =
  | 'future'
  | 'late-window'
  | 'avisaste-credito'
  | 'avisaste-pedido'
  | 'avisaste-usada'
  | 'avisaste-vencida'
  | 'tarde'
  | 'studio'
  | 'recovery'
  | 'suelta'
  | 'past'

export type ClassRowData = {
  key: string
  date: string
  dow: number
  isToday: boolean
  past: boolean
  start: string
  typeName: string
  instructor: string | null
  state: ClassState
  note: string
  /** Crédito disponible para "Elegir clase". */
  chooseCreditId?: string
  /** "Al final voy". */
  undo?: { enrollmentId: string; classId: string; sessionDate: string }
  /** "Avisar que no voy". */
  avoid?: AvoidInfo
  /** "Cancelar recuperación" (solo en recuperaciones confirmadas que todavía no empezaron). */
  recoveryCancel?: { creditId: string; onTime: boolean; whenLabel: string; start: string }
}

export type ClassWeek = { title: string; range: string; rows: ClassRowData[] }

export type RecoveryCardData = {
  id: string
  status: 'requested' | 'available'
  title: string
  origin: string
  /** "viernes 9" */
  until: string
}

export type ActivityItem = { text: string; tone: 'yellow' | 'green' | 'red'; date: string }

export type NextClassData = {
  dayLabel: string
  start: string
  chip: string
  typeName: string
  instructor: string | null
}
