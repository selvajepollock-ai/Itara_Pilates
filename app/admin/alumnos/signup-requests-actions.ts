'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function rejectSignupRequest(requestId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).maybeSingle()
  if (!profile?.roles?.includes('admin')) return { error: 'No tenés permisos.' }

  const { error } = await supabase
    .from('signup_requests')
    .update({ status: 'rejected' })
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath('/admin/alumnos')
  return { success: true }
}
