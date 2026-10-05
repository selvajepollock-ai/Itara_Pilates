'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

/** La persona cierra un aviso del estudio: deja de verlo (el comunicado sigue vigente para los demás). */
export async function dismissAnnouncement(announcementId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { error } = await supabase
    .from('announcement_dismissals')
    .upsert({ user_id: user.id, announcement_id: announcementId }, { onConflict: 'user_id,announcement_id' })
  if (error) return { error: error.message }

  revalidatePath('/alumno')
  revalidatePath('/instructor')
  return { success: true }
}
