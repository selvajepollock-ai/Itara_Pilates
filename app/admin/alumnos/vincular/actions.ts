'use server'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
function isValidUsername(u: string) {
  return /^[a-z0-9_.]{3,20}$/.test(u)
}
async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }
  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).maybeSingle()
  if (!profile?.roles?.includes('admin')) {
    return { ok: false as const, error: 'No tenés permisos para esta acción.' }
  }
  return { ok: true as const, supabase }
}
export async function searchStudentsByName(query: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error, results: [] }
  const trimmed = query.trim()
  if (trimmed.length < 2) return { results: [] }
  const { data, error } = await auth.supabase
    .from('profiles')
    .select('id, full_name, nickname, email, phone')
    .contains('roles', ['student'])
    .ilike('full_name', `%${trimmed}%`)
    .order('full_name')
    .limit(8)
  if (error) return { error: error.message, results: [] }
  return { results: data ?? [] }
}
export async function linkSignupToStudent(requestId: string, studentId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()
  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  if (!fullName || !email) return { error: 'Faltan datos de la solicitud.' }
  if (username && !isValidUsername(username)) {
    return { error: 'El usuario de la solicitud no tiene un formato válido.' }
  }
  const admin = createAdminClient()
  const { error: authError } = await admin.auth.admin.updateUserById(studentId, {
    email,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }
  const { error: profileError } = await admin
    .from('profiles')
    .update({
      full_name: fullName,
      email,
      contact_email: null,
      ...(phone ? { phone } : {}),
      ...(username ? { username } : {}),
    })
    .eq('id', studentId)
  if (profileError) {
    if (profileError.message.toLowerCase().includes('duplicate')) {
      return { error: 'Ese usuario ya está en uso por otra persona.' }
    }
    return { error: profileError.message }
  }
  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.startsWith('localhost') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`
  const supabase = await createClient()
  // Mail de bienvenida (primer acceso): usa la plantilla "Magic Link" de Supabase,
  // separada de "Reset Password" que usan los alumnos ya activos que olvidaron su clave.
  const { error: welcomeError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: `${siteUrl}/auth/confirm?next=/auth/set-password`,
    },
  })
  if (welcomeError) return { error: welcomeError.message }
  await admin
    .from('signup_requests')
    .update({ status: 'accepted', accepted_student_id: studentId })
    .eq('id', requestId)
  revalidatePath('/admin/alumnos')
  revalidatePath(`/admin/alumnos/${studentId}`)
  return { success: true }
}
