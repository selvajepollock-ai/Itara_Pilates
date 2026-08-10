'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateNoAccessEmail } from '@/lib/auth-username'

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

export async function createStudent(formData: FormData) {
  const firstName = String(formData.get('first_name') ?? '').trim()
  const lastName = String(formData.get('last_name') ?? '').trim()
  const fullName = `${firstName} ${lastName}`.trim()
  const emailInput = String(formData.get('email') ?? '').trim().toLowerCase()
  const phone = String(formData.get('phone') ?? '').trim()
  const birthDate = String(formData.get('birth_date') ?? '').trim()
  const healthNotes = String(formData.get('health_notes') ?? '').trim()
  const nickname = String(formData.get('nickname') ?? '').trim()
  const planId = String(formData.get('plan_id') ?? '').trim()
  const endDate = String(formData.get('end_date') ?? '').trim()
  const grantAccess = formData.get('grant_access') === 'on'

  if (!firstName || !lastName) {
    return { error: 'Nombre y apellido son obligatorios.' }
  }
  if (grantAccess && !emailInput) {
    return { error: 'Si le das acceso ahora, el email es obligatorio.' }
  }

  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.startsWith('localhost') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`

  const admin = createAdminClient()
  let newUserId: string | undefined

  if (grantAccess) {
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(emailInput, {
      data: { full_name: fullName, roles: ['student'] },
      redirectTo: `${siteUrl}/auth/confirm?next=/auth/set-password`,
    })
    if (inviteError) return { error: inviteError.message }
    newUserId = invited.user?.id
  } else {
    const authEmail = emailInput || generateNoAccessEmail(fullName)
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: authEmail,
      password: crypto.randomUUID(),
      email_confirm: true,
      user_metadata: { full_name: fullName, roles: ['student'] },
    })
    if (createError) return { error: createError.message }
    newUserId = created.user?.id

    // Si el admin cargó un email real pero no dio acceso, lo guardamos como contacto igual
    if (newUserId && emailInput) {
      await admin.from('profiles').update({ contact_email: emailInput }).eq('id', newUserId)
    }
  }

  if (newUserId && (phone || birthDate || healthNotes || nickname)) {
    await admin
      .from('profiles')
      .update({
        ...(phone ? { phone } : {}),
        ...(birthDate ? { birth_date: birthDate } : {}),
        ...(healthNotes ? { health_notes: healthNotes } : {}),
        ...(nickname ? { nickname } : {}),
      })
      .eq('id', newUserId)
  }

  if (newUserId && planId && endDate) {
    await admin.from('subscriptions').insert({
      student_id: newUserId,
      plan_id: planId,
      end_date: endDate,
      status: 'active',
    })
  }

  const requestId = String(formData.get('request_id') ?? '').trim()
  if (requestId && newUserId) {
    await admin
      .from('signup_requests')
      .update({ status: 'accepted', accepted_student_id: newUserId })
      .eq('id', requestId)
  }

  revalidatePath('/admin/alumnos')
  return { success: true }
}
