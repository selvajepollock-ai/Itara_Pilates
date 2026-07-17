export const DAY_NAMES = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
] as const

// Orden de exhibición: Lunes a Domingo
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

export function formatTime(time: string) {
  // 'time' viene como 'HH:MM:SS' desde Postgres
  return time.slice(0, 5)
}
