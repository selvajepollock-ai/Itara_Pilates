'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { usernameToInternalEmail } from '@/lib/auth-username'

export async function createInstructor(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const phone = String(formData.get('phone') ?? '').trim()
  const alsoAdmin = formData.get('also_admin') === 'on'

  if (!fullName || !username || !password) {
    return { error: 'Nombre, usuario y contraseña son obligatorios.' }
  }
  if (password.length < 6) {
    return { error: 'La contraseña debe tener al menos 6 caracteres.' }
  }
  if (/\s/.test(username)) {
    return { error: 'El usuario no puede tener espacios.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado.' }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('roles')
    .eq('id', user.id)
    .single()

  if (!callerProfile?.roles?.includes('admin')) {
    return { error: 'No tenés permisos para esta acción.' }
  }

  const admin = createAdminClient()
  const roles = alsoAdmin ? ['instructor', 'admin'] : ['instructor']

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: usernameToInternalEmail(username),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, username, roles },
  })

  if (createError) {
    if (createError.message.toLowerCase().includes('already registered')) {
      return { error: 'Ese usuario ya existe. Elegí otro.' }
    }
    return { error: createError.message }
  }

  if (created.user?.id && phone) {
    await admin.from('profiles').update({ phone }).eq('id', created.user.id)
  }

  revalidatePath('/admin/instructores')
  return { success: true }
}
