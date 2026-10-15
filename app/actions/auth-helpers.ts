'use server'

import { createAdminClient } from '@/lib/supabase/admin'

// Traduce un "usuario" al email real asociado, para poder loguear o resetear contraseña.
// Usa el cliente admin porque esto se llama ANTES de estar autenticado (no hay sesión todavía).
export async function resolveLoginEmail(identifier: string): Promise<string | null> {
  const clean = identifier.trim().toLowerCase()
  if (clean.includes('@')) return clean

  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('email').eq('username', clean).maybeSingle()
  return data?.email ?? null
}