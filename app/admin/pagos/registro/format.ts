const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** "Viernes 2 de octubre" */
export function dayTitle(iso: string) {
  const s = new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
  return cap(s.replace(',', ''))
}

/** "octubre" */
export function monthName(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('es-AR', { month: 'long', timeZone: 'UTC' })
}

/** "$432k", "$1,2M": monto abreviado para el calendario. */
export function shortMoney(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace('.', ',').replace(/,0$/, '')}M`
  if (n >= 1000) return `$${Math.round(n / 1000)}k`
  return `$${Math.round(n)}`
}

export const dayNumber = (iso: string) => Number(iso.slice(8, 10))
