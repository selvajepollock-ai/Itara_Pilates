'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

function isValidUsername(u: string) {
  return /^[a-z0-9_.]{3,20}$/.test(u)
}

export async function updateMyProfile(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const fullName = String(formData.get('full_name') ?? '').trim()
  const nickname = String(formData.get('nickname') ?? '').trim()
  const phone = String(formData.get('phone') ?? '').trim()
  const birthDate = String(formData.get('birth_date') ?? '').trim()
  const username = String(formData.get('username') ?? '').trim().toLowerCase()

  if (!fullName) return { error: 'El nombre es obligatorio.' }
  if (!username || !isValidUsername(username)) {
    return {
      error: 'El usuario debe tener minúsculas, números, "_" o ".", entre 3 y 20 caracteres.',
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      nickname: nickname || null,
      phone: phone || null,
      birth_date: birthDate || null,
      username,
    })
    .eq('id', user.id)

  if (error) {
    if (error.message.toLowerCase().includes('duplicate')) {
      return { error: 'Ese usuario ya está en uso. Elegí otro.' }
    }
    return { error: error.message }
  }

  revalidatePath('/alumno/perfil')
  return { success: true }
}
