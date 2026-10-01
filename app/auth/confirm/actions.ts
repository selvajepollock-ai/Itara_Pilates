'use server'

import { type EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Valida el link de invitación/recuperación. A propósito NO se llama desde un GET:
 * los escaneos automáticos de los clientes de mail (Outlook, Gmail, etc.) abren los
 * links de la casilla antes de que la persona los toque, para revisar que no sean
 * spam -- eso gastaba el link de un solo uso antes de que el alumno llegara a usarlo.
 * Al requerir un click real (este server action), esos escaneos ya no lo consumen.
 */
export async function confirmInviteLink({
  tokenHash,
  type,
}: {
  tokenHash: string
  type: EmailOtpType
}) {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) return { error: error.message }
  return { success: true }
}
