'use server'

import { createClient } from '@/lib/supabase/server'

export async function createSignupRequest(formData: FormData) {
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!firstName || !lastName || !email) {
    return { error: 'Completá nombre, apellido y email.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('signup_requests').insert({
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
  })

  if (error) return { error: 'No se pudo enviar. Probá de nuevo en un momento.' }

  return { success: true }
}
