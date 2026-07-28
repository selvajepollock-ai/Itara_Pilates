'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function createOwner(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const phone = String(formData.get('phone') ?? '').trim()
  const alsoInstructor = formData.get('also_instructor') === 'on'
  const inviteByEmail = formData.get('invite_by_email') === 'on'

  if (!fullName || !username || !email) {
    return { error: 'Nombre, usuario y email son obligatorios.' }
  }
  if (!inviteByEmail && !password) {
    return { error: 'Ingresá una contraseña, o tildá "Enviar invitación por mail".' }
  }
  if (password && password.length < 6) {
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
  const roles = alsoInstructor ? ['admin', 'instructor'] : ['admin']
  let newUserId: string | undefined

  if (inviteByEmail) {
    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = host?.startsWith('localhost') ? 'http' : 'https'
    const siteUrl = `${protocol}://${host}`

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, username, roles },
      redirectTo: `${siteUrl}/auth/confirm?next=/auth/set-password`,
    })
    if (inviteError) {
      if (inviteError.message.toLowerCase().includes('already registered')) {
        return { error: 'Ese email ya existe.' }
      }
      return { error: inviteError.message }
    }
    newUserId = invited.user?.id
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, username, roles },
    })
    if (createError) {
      if (createError.message.toLowerCase().includes('already registered')) {
        return { error: 'Ese email o usuario ya existe.' }
      }
      return { error: createError.message }
    }
    newUserId = created.user?.id
  }

  if (newUserId && phone) {
    await admin.from('profiles').update({ phone }).eq('id', newUserId)
  }

  revalidatePath('/admin/instructores')
  return { success: true }
}

export async function createInstructor(formData: FormData) {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const username = String(formData.get('username') ?? '').trim().toLowerCase()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const password = String(formData.get('password') ?? '')
  const phone = String(formData.get('phone') ?? '').trim()
  const alsoAdmin = formData.get('also_admin') === 'on'
  const inviteByEmail = formData.get('invite_by_email') === 'on'

  if (!fullName || !username || !email) {
    return { error: 'Nombre, usuario y email son obligatorios.' }
  }
  if (!inviteByEmail && !password) {
    return { error: 'Ingresá una contraseña, o tildá "Enviar invitación por mail".' }
  }
  if (password && password.length < 6) {
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
  let newUserId: string | undefined

  if (inviteByEmail) {
    const headersList = await headers()
    const host = headersList.get('host')
    const protocol = host?.startsWith('localhost') ? 'http' : 'https'
    const siteUrl = `${protocol}://${host}`

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, username, roles },
      redirectTo: `${siteUrl}/auth/confirm?next=/auth/set-password`,
    })
    if (inviteError) {
      if (inviteError.message.toLowerCase().includes('already registered')) {
        return { error: 'Ese email ya existe.' }
      }
      return { error: inviteError.message }
    }
    newUserId = invited.user?.id
  } else {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, username, roles },
    })
    if (createError) {
      if (createError.message.toLowerCase().includes('already registered')) {
        return { error: 'Ese email o usuario ya existe.' }
      }
      return { error: createError.message }
    }
    newUserId = created.user?.id
  }

  if (newUserId && phone) {
    await admin.from('profiles').update({ phone }).eq('id', newUserId)
  }

  revalidatePath('/admin/instructores')
  return { success: true }
}
