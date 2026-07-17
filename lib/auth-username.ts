// Supabase Auth siempre requiere un "email" internamente para el login.
// Para instructores sin mail real, generamos uno interno a partir del usuario.
export const INTERNAL_EMAIL_DOMAIN = 'staff.itara-pilates.internal'

export function usernameToInternalEmail(username: string) {
  const clean = username.trim().toLowerCase().replace(/\s+/g, '')
  return `${clean}@${INTERNAL_EMAIL_DOMAIN}`
}

export function isEmailLike(value: string) {
  return value.includes('@')
}
