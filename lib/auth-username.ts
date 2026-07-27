// Supabase Auth siempre requiere un "email" internamente para el login.
// Para instructores sin mail real, generamos uno interno a partir del usuario.
export const INTERNAL_EMAIL_DOMAIN = 'staff.itara-pilates.internal'

// Para alumnos cargados SIN acceso al portal (aún no tienen mail real cargado)
export const NO_ACCESS_EMAIL_DOMAIN = 'sin-acceso.itara-pilates.internal'

export function usernameToInternalEmail(username: string) {
  const clean = username.trim().toLowerCase().replace(/\s+/g, '')
  return `${clean}@${INTERNAL_EMAIL_DOMAIN}`
}

export function generateNoAccessEmail(fullName: string) {
  const slug = fullName
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const suffix = Math.random().toString(36).slice(2, 8)
  return `${slug}-${suffix}@${NO_ACCESS_EMAIL_DOMAIN}`
}

export function isNoAccessEmail(email: string) {
  return email.endsWith(`@${NO_ACCESS_EMAIL_DOMAIN}`)
}

export function isEmailLike(value: string) {
  return value.includes('@')
}
