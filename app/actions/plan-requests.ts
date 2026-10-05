'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { notifyAdmins } from '@/lib/push'

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

  const { data: who } = await supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle()
  await notifyAdmins({
    title: 'Cambio de plan 📝',
    body: `${who?.full_name ?? 'Una alumna'} pidió cambiar de plan.`,
    url: '/admin/avisos',
    tag: `plan-request-${user.id}`,
  })

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
