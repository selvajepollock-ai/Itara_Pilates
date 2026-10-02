/**
 * Link de WhatsApp para un teléfono guardado en cualquier formato. Solo normaliza
 * para armar el link: no modifica lo guardado.
 * 1) se quita todo lo que no sea dígito; 2) si no empieza con 54, se antepone 549.
 * Con menos de 10 dígitos (o sin teléfono) devuelve null y el botón no se muestra.
 */
export function whatsappLink(phone: string | null | undefined) {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.length < 10) return null
  if (!digits.startsWith('54')) digits = `549${digits}`
  return `https://wa.me/${digits}`
}
