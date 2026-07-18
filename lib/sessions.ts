// Convierte el horario recurrente (day_of_week) en fechas concretas de una semana puntual.

export function getMonday(date: Date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export function getSunday(monday: Date) {
  const d = new Date(monday)
  d.setDate(d.getDate() + 6)
  return d
}

export function toISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}

// day_of_week: 0=domingo ... 6=sábado. Devuelve la fecha de ese día dentro de la semana que empieza en `monday`.
export function dateForDayOfWeek(monday: Date, dayOfWeek: number) {
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const d = new Date(monday)
  d.setDate(d.getDate() + offset)
  return d
}

export function isInPast(sessionDate: string, startTime: string) {
  const sessionDateTime = new Date(`${sessionDate}T${startTime}`)
  return sessionDateTime.getTime() < Date.now()
}

export function hoursUntil(sessionDate: string, startTime: string) {
  const sessionDateTime = new Date(`${sessionDate}T${startTime}`)
  return (sessionDateTime.getTime() - Date.now()) / (1000 * 60 * 60)
}
