'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.', userId: null }

  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).maybeSingle()
  if (!profile?.roles?.includes('admin')) {
    return { ok: false as const, error: 'No tenés permisos para esta acción.', userId: null }
  }
  return { ok: true as const, supabase, userId: user.id }
}

export async function createAnnouncement(formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const message = String(formData.get('message') ?? '').trim()
  const expiresAt = String(formData.get('expires_at') ?? '').trim()

  if (!message) return { error: 'El mensaje no puede estar vacío.' }

  const { error } = await auth.supabase.from('announcements').insert({
    message,
    expires_at: expiresAt || null,
    created_by: auth.userId,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/notificaciones')
  revalidatePath('/alumno')
  revalidatePath('/instructor')
  return { success: true }
}

export async function deleteAnnouncement(announcementId: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const { error } = await auth.supabase.from('announcements').delete().eq('id', announcementId)
  if (error) return { error: error.message }

  revalidatePath('/admin/notificaciones')
  revalidatePath('/alumno')
  revalidatePath('/instructor')
}
