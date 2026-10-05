'use server'

import { createClient } from '@/lib/supabase/server'

type SubscriptionInput = { endpoint: string; p256dh: string; auth: string; userAgent?: string }

/** Guarda el dispositivo de la persona que está en sesión (queda activo para recibir avisos). */
export async function savePushSubscription(input: SubscriptionInput) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  if (!input.endpoint || !input.p256dh || !input.auth) return { error: 'Suscripción inválida.' }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      user_id: user.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      user_agent: input.userAgent?.slice(0, 300) ?? null,
    },
    { onConflict: 'endpoint' }
  )
  if (error) return { error: error.message }
  return { success: true }
}

/** Quita el dispositivo (la persona desactivó los avisos). */
export async function removePushSubscription(endpoint: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', user.id)
  if (error) return { error: error.message }
  return { success: true }
}
