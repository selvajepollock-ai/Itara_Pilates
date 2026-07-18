'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

async function assertAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'No autenticado.' }

  const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single()
  if (!profile?.roles?.includes('admin')) {
    return { ok: false as const, error: 'No tenés permisos para esta acción.' }
  }
  return { ok: true as const, supabase }
}

export async function createPlan(formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const name = String(formData.get('name') ?? '').trim()
  const price = Number(formData.get('price') ?? 0)

  if (!name || !price) return { error: 'Nombre y precio son obligatorios.' }

  const { error } = await auth.supabase.from('plans').insert({
    name,
    price,
    type: 'monthly',
    classes_included: null,
    duration_days: 30,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/planes')
  return { success: true }
}

export async function setPlanActive(planId: string, active: boolean) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const { error } = await auth.supabase.from('plans').update({ active }).eq('id', planId)
  if (error) return { error: error.message }

  revalidatePath('/admin/planes')
}

export async function assignPlan(studentId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const plan_id = String(formData.get('plan_id') ?? '')
  const end_date = String(formData.get('end_date') ?? '')

  if (!plan_id || !end_date) return { error: 'Elegí un plan y una fecha.' }

  const { data: existing } = await auth.supabase
    .from('subscriptions')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle()

  if (existing) {
    const { error } = await auth.supabase
      .from('subscriptions')
      .update({ plan_id, end_date })
      .eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await auth.supabase.from('subscriptions').insert({
      student_id: studentId,
      plan_id,
      end_date,
      status: 'active',
    })
    if (error) return { error: error.message }
  }

  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/alumnos')
  return { success: true }
}

export async function registerPayment(
  subscriptionId: string,
  studentId: string,
  formData: FormData
) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const amount = Number(formData.get('amount') ?? 0)
  const newEndDate = String(formData.get('new_end_date') ?? '')
  const notes = String(formData.get('notes') ?? '').trim()

  if (!newEndDate) return { error: 'Falta la nueva fecha de vencimiento.' }

  const { error: payError } = await auth.supabase.from('payments').insert({
    subscription_id: subscriptionId,
    amount: amount || 0,
    method: 'manual',
    notes: notes || null,
  })
  if (payError) return { error: payError.message }

  const { error: subError } = await auth.supabase
    .from('subscriptions')
    .update({ end_date: newEndDate, status: 'active' })
    .eq('id', subscriptionId)
  if (subError) return { error: subError.message }

  revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/alumnos')
  revalidatePath('/admin')
  return { success: true }
}
