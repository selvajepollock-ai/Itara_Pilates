export function daysUntilNextBirthday(birthDate: string, today: Date = new Date()) {
  const [, month, day] = birthDate.split('-').map(Number)
  const year = today.getFullYear()

  let next = new Date(year, month - 1, day)
  next.setHours(0, 0, 0, 0)
  const todayMidnight = new Date(today)
  todayMidnight.setHours(0, 0, 0, 0)

  if (next < todayMidnight) {
    next = new Date(year + 1, month - 1, day)
  }

  const diffMs = next.getTime() - todayMidnight.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function formatBirthday(birthDate: string) {
  const [, month, day] = birthDate.split('-').map(Number)
  const date = new Date(2000, month - 1, day)
  return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })
}
