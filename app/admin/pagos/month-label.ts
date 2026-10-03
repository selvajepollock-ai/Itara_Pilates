const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** "2026-10" → "Octubre 2026". Archivo aparte (sin 'use client') para poder usarlo desde páginas de servidor. */
export function monthLabel(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  const name = MONTHS[m - 1]
  return `${name[0].toUpperCase()}${name.slice(1)} ${y}`
}
