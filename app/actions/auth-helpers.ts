'use server'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { siteUrlForHost } from '@/lib/site-url'

// Traduce un "usuario" al email real asociado. Usa el cliente admin porque esto se llama ANTES de estar
// autenticado. IMPORTANTE: el email NUNCA se devuelve al navegador (no está exportado): si se devolviera,
// cualquiera podría averiguar el email real de un usuario probando nombres de usuario.
async function resolveEmail(identifier: string): Promise<string | null> {
  const clean = identifier.trim().toLowerCase()
  if (!clean || clean.length > 254) return null
  if (clean.includes('@')) return clean

  const admin = createAdminClient()
  const { data } = await admin.from('profiles').select('email').eq('username', clean).maybeSingle()
  return data?.email ?? null
}

/** Inicia sesión con email o usuario. Siempre responde lo mismo si falla, exista o no la cuenta. */
export async function signInWithIdentifier(identifier: string, password: string): Promise<{ error?: string }> {
  const generic = { error: 'Email/usuario o contraseña incorrectos.' }
  if (!password || password.length > 200) return generic

  const email = await resolveEmail(identifier)
  if (!email) return generic

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  return error ? generic : {}
}

/** Pide el mail para crear una contraseña nueva. No dice si la cuenta existe. */
export async function requestPasswordReset(identifier: string): Promise<{ success: true }> {
  const email = await resolveEmail(identifier)
  if (email) {
    const siteUrl = siteUrlForHost((await headers()).get('host'))
    const supabase = await createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/confirm?next=/auth/set-password`,
    })
  }
  return { success: true }
}
