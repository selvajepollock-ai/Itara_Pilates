'use server'

import { createClient } from '@/lib/supabase/server'

function isValidUsername(u: string) {
  return /^[a-z0-9_.]{3,20}$/.test(u)
}

export async function createSignupRequest(formData: FormData) {
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()
  const username = String(formData.get('username') ?? '').trim().toLowerCase()

  if (!firstName || !lastName || !email) {
    return { error: 'Completá nombre, apellido y email.' }
  }
  if (!username || !isValidUsername(username)) {
    return { error: 'Elegí un usuario válido: minúsculas, números, "_" o ".", entre 3 y 20 caracteres.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.from('signup_requests').insert({
    first_name: firstName,
    last_name: lastName,
    email,
    phone: phone || null,
    username,
  })

  if (error) return { error: 'No se pudo enviar. Probá de nuevo en un momento.' }

  return { success: true }
}
