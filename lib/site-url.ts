/**
 * Dominio público oficial del estudio.
 * Se usa en links que se comparten o se mandan por mail.
 * Se puede sobreescribir con la variable de entorno NEXT_PUBLIC_SITE_URL
 * (útil para entornos de staging); si no está, cae al dominio oficial.
 */
export const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://itarapilates.com.ar'
).replace(/\/+$/, '')

/**
 * Origen a usar para un request concreto.
 * En desarrollo local (localhost / 127.0.0.1) devuelve el host local para poder
 * probar los flujos de mail; en cualquier otro caso, siempre el dominio oficial.
 */
export function siteUrlForHost(host: string | null | undefined): string {
  if (host && (host.startsWith('localhost') || host.startsWith('127.0.0.1'))) {
    return `http://${host}`
  }
  return PUBLIC_SITE_URL
}
