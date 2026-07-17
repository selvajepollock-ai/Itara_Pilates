'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createStudent(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()
  const birthDate = String(formData.get('birth_date') ?? '').trim()

  if (!fullName || !email) {
    return { error: 'Nombre y email son obligatorios.' }
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

  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.startsWith('localhost') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`

  const admin = createAdminClient()

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, roles: ['student'] },
    redirectTo: `${siteUrl}/auth/confirm?next=/auth/set-password`,
  })

  if (inviteError) return { error: inviteError.message }

  if (invited.user?.id && (phone || birthDate)) {
    await admin
      .from('profiles')
      .update({
        ...(phone ? { phone } : {}),
        ...(birthDate ? { birth_date: birthDate } : {}),
      })
      .eq('id', invited.user.id)
  }

  revalidatePath('/admin/alumnos')
  return { success: true }
}
