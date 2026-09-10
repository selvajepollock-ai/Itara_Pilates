'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

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

export async function createPlan(formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const name = String(formData.get('name') ?? '').trim()
  const price = Number(formData.get('price') ?? 0)
  const category = String(formData.get('category') ?? 'reformer')
  const classesPerWeekRaw = String(formData.get('classes_per_week') ?? '').trim()
  const classesPerWeek = classesPerWeekRaw ? Number(classesPerWeekRaw) : null

  if (!name || !price) return { error: 'Nombre y precio son obligatorios.' }

  const { error } = await auth.supabase.from('plans').insert({
    name,
    price,
    category,
    classes_per_week: classesPerWeek,
    type: 'monthly',
    classes_included: null,
    duration_days: 30,
  })

  if (error) return { error: error.message }

  revalidatePath('/admin/planes')
  return { success: true }
}

export async function updatePlan(planId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const name = String(formData.get('name') ?? '').trim()
  const price = Number(formData.get('price') ?? 0)
  const category = String(formData.get('category') ?? 'reformer')
  const classesPerWeekRaw = String(formData.get('classes_per_week') ?? '').trim()
  const classesPerWeek = classesPerWeekRaw ? Number(classesPerWeekRaw) : null

  if (!name || !price) return { error: 'Nombre y precio son obligatorios.' }

  const { error } = await auth.supabase
    .from('plans')
    .update({ name, price, category, classes_per_week: classesPerWeek })
    .eq('id', planId)
  if (error) return { error: error.message }

  revalidatePath('/admin/planes')
  revalidatePath('/admin/alumnos')
  return { success: true }
}

export async function setPlanActive(planId: string, active: boolean) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const { error } = await auth.supabase.from('plans').update({ active }).eq('id', planId)
  if (error) return { error: error.message }

  revalidatePath('/admin/planes')
}
