// Características de 3 dígitos más comunes (el resto de los números de 10 dígitos se toma con 4).
const AREA_3 = new Set([
  '221', '223', '261', '263', '264', '266', '280', '291', '294', '299', '341', '342', '343', '345', '351', '353',
  '358', '362', '370', '376', '379', '381', '383', '385', '387', '388',
])

const groups4 = (d: string) => d.replace(/(\d{4})(?=\d)/g, '$1 ')

/**
 * Teléfono para mostrar (no modifica lo guardado): sin +54 ni el 9 inicial y con la característica separada.
 * Ej: "3751 52-5946", "379 467-8267", "11 2345-6789". Si no se puede inferir, dígitos agrupados de a 4.
 */
export function formatPhoneDisplay(phone: string | null | undefined) {
  if (!phone) return null
  let d = phone.replace(/\D/g, '')
  if (!d) return null
  if (d.startsWith('54')) d = d.slice(2)
  if (d.startsWith('9') && d.length === 11) d = d.slice(1)
  if (d.startsWith('0')) d = d.slice(1)
  if (d.length !== 10) return groups4(d)
  if (d.startsWith('11')) return `${d.slice(0, 2)} ${d.slice(2, 6)}-${d.slice(6)}`
  if (AREA_3.has(d.slice(0, 3))) return `${d.slice(0, 3)} ${d.slice(3, 6)}-${d.slice(6)}`
  return `${d.slice(0, 4)} ${d.slice(4, 6)}-${d.slice(6)}`
}
