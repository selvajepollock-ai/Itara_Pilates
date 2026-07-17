'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export async function updateStudent(studentId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()

  if (!fullName || !email) return { error: 'Nombre y email son obligatorios.' }

  const admin = createAdminClient()

  const { error: authError } = await admin.auth.admin.updateUserById(studentId, { email })
  if (authError) return { error: authError.message }

  const { error } = await admin
    .from('profiles')
    .update({ full_name: fullName, email, phone: phone || null })
    .eq('id', studentId)

  if (error) return { error: error.message }

  revalidatePath('/admin/alumnos')
  revalidatePath(`/admin/alumnos/${studentId}`)
  return { success: true }
}

export async function setStudentPassword(studentId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const password = String(formData.get('password') ?? '')
  if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.updateUserById(studentId, { password })
  if (error) return { error: error.message }

  return { success: true }
}
