'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function requestPlanChange(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { error: 'No autenticado.' }

  const requested_plan_id = String(formData.get('requested_plan_id') ?? '')
  const note = String(formData.get('note') ?? '').trim()

  if (!requested_plan_id) return { error: 'Elegí un plan.' }

  const { error } = await supabase.from('plan_change_requests').insert({
    student_id: user.id,
    requested_plan_id,
    note: note || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/alumno')
  revalidatePath('/admin/avisos')
  return { success: true }
}

export async function resolvePlanChangeRequest(requestId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }

  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  if (!profile?.roles?.includes('admin')) return { error: 'No tenés permisos.' }

  const { error } = await supabase
    .from('plan_change_requests')
    .update({ status: 'resolved' })
    .eq('id', requestId)

  if (error) return { error: error.message }

  revalidatePath('/admin/avisos')
}
