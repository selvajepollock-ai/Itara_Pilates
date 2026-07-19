'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { usernameToInternalEmail } from '@/lib/auth-username'

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }

  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  if (!profile?.roles?.includes('admin')) {
    return { ok: false as const, error: 'No tenés permisos para esta acción.' }
  }
  return { ok: true as const }
}

export async function updateInstructor(instructorId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const fullName = String(formData.get('full_name') ?? '').trim()
  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()
  const alsoAdmin = formData.get('also_admin') === 'on'

  if (!fullName || !username) return { error: 'Nombre y usuario son obligatorios.' }
  if (/\s/.test(username)) return { error: 'El usuario no puede tener espacios.' }

  const admin = createAdminClient()

  const { error: authError } = await admin.auth.admin.updateUserById(instructorId, {
    email: usernameToInternalEmail(username),
  })
  if (authError) return { error: authError.message }

  const roles = alsoAdmin ? ['instructor', 'admin'] : ['instructor']

  const { error } = await admin
    .from('profiles')
    .update({ full_name: fullName, username, phone: phone || null, roles })
    .eq('id', instructorId)

  if (error) return { error: error.message }

  revalidatePath('/admin/instructores')
  revalidatePath(`/admin/instructores/${instructorId}`)
  return { success: true }
}

export async function setInstructorPassword(instructorId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const password = String(formData.get('password') ?? '')
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(instructorId, { password })
  if (error) return { error: error.message }

  return { success: true }
}
