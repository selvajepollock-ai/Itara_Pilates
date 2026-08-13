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
  let expiresAt = String(formData.get('expires_at') ?? '').trim()
  const targetType = String(formData.get('target_type') ?? 'all').trim()

  if (!message) return { error: 'El mensaje no puede estar vacío.' }
  if (!['all', 'people', 'class'].includes(targetType)) {
    return { error: 'Destinatario inválido.' }
  }

  let targetUsernames: string[] | null = null
  let targetClassId: string | null = null
  let targetDate: string | null = null

  if (targetType === 'people') {
    const raw = String(formData.get('target_usernames') ?? '').trim()
    targetUsernames = raw
      .split(',')
      .map((u) => u.trim().toLowerCase().replace(/^@/, ''))
      .filter(Boolean)
    if (targetUsernames.length === 0) {
      return { error: 'Ingresá al menos un usuario.' }
    }
  }

  if (targetType === 'class') {
    targetClassId = String(formData.get('target_class_id') ?? '').trim() || null
    targetDate = String(formData.get('target_date') ?? '').trim() || null
    if (!targetClassId) return { error: 'Elegí una clase.' }
    if (!targetDate) return { error: 'Elegí la fecha puntual.' }

    const { data: classInfo } = await auth.supabase
      .from('classes')
      .select('day_of_week')
      .eq('id', targetClassId)
      .maybeSingle()

    if (!classInfo) return { error: 'Esa clase ya no existe.' }

    const chosenDayOfWeek = new Date(`${targetDate}T00:00:00`).getDay()
    if (chosenDayOfWeek !== classInfo.day_of_week) {
      return { error: 'La fecha elegida no coincide con el día de la semana de esa clase.' }
    }

    if (!expiresAt) expiresAt = targetDate
  }

  const { error } = await auth.supabase.from('announcements').insert({
    message,
    expires_at: expiresAt || null,
    created_by: auth.userId,
    target_type: targetType,
    target_usernames: targetUsernames,
    target_class_id: targetClassId,
    target_date: targetDate,
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
