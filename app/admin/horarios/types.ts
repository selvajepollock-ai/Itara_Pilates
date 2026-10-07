/** Alumno con lugar fijo en una clase (una fila de `enrollments` activa). */
export type FixedStudent = { enrollmentId: string; studentId: string; name: string }

export type ClassItem = {
  id: string
  /** 0 = domingo … 6 = sábado */
  dow: number
  /** "HH:MM" */
  start: string
  end: string
  capacity: number
  room?: string
  typeName: string
  instructorName: string | null
  fixed: FixedStudent[]
}

/** Alumno que viene a recuperar en una fecha puntual. */
export type Recovering = { studentId: string; name: string }

export type OccurrenceData = {
  /** `${classId}|${yyyy-mm-dd}` → ids de inscripción que avisaron que no vienen. */
  cancelled: Record<string, string[]>
  /** `${classId}|${yyyy-mm-dd}` → alumnos que vienen a recuperar. */
  recovering: Record<string, Recovering[]>
  /** `${classId}|${yyyy-mm-dd}` de clases canceladas enteras. */
  wholeCancelled: string[]
}

export type DayColumn = { dow: number; date: string; holiday: string | null }

export type Vista = 'semana' | 'fijo' | 'clases'
