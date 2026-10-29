'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { todayART } from '@/lib/dates'
import { loadPriceSchedule, planPriceAt } from '@/lib/plan-prices'

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
  return { ok: true as const, supabase, userId: user.id }
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

  const { data: created, error } = await auth.supabase
    .from('plans')
    .insert({
      name,
      price,
      category,
      classes_per_week: classesPerWeek,
      type: 'monthly',
      classes_included: null,
      duration_days: 30,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Primer precio del historial: vigente desde siempre.
  await auth.supabase.from('plan_prices').insert({ plan_id: created.id, price, valid_from: '2000-01-01', created_by: auth.userId })

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

  // "Vigente desde": siempre el 1° de un mes (YYYY-MM-01). Desde este mes o uno que viene.
  const today = todayART()
  const validFrom = String(formData.get('valid_from') ?? '') || `${today.slice(0, 7)}-01`
  if (!/^d{4}-d{2}-01$/.test(validFrom)) return { error: 'Elegí desde qué mes rige el precio.' }
  if (validFrom < `${today.slice(0, 7)}-01`) return { error: 'El precio no puede regir desde un mes que ya pasó.' }
  const startsNow = validFrom <= today

  const { error } = await auth.supabase
    .from('plans')
    .update({ name, category, classes_per_week: classesPerWeek, ...(startsNow ? { price } : {}) })
    .eq('id', planId)
  if (error) return { error: error.message }

  // Solo se guarda un precio nuevo si cambia respecto del que ya rige ese mes.
  const schedule = await loadPriceSchedule(auth.supabase)
  const { data: plan } = await auth.supabase.from('plans').select('price').eq('id', planId).single()
  if (planPriceAt(schedule, planId, plan?.price, validFrom) !== price) {
    const { error: priceError } = await auth.supabase
      .from('plan_prices')
      .upsert({ plan_id: planId, price, valid_from: validFrom, created_by: auth.userId }, { onConflict: 'plan_id,valid_from' })
    if (priceError) return { error: priceError.message }
  }

  revalidatePath('/admin', 'layout')
  return { success: true }
}

/** Cancela un aumento programado que todavía no entró en vigencia. */
export async function cancelScheduledPrice(planId: string, validFrom: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }
  if (validFrom <= todayART()) return { error: 'Ese precio ya está vigente: cargá uno nuevo en su lugar.' }

  const { error } = await auth.supabase.from('plan_prices').delete().eq('plan_id', planId).eq('valid_from', validFrom)
  if (error) return { error: error.message }

  revalidatePath('/admin', 'layout')
  return { success: true }
}

export async function setPlanActive(planId: string, active: boolean) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const { error } = await auth.supabase.from('plans').update({ active }).eq('id', planId)
  if (error) return { error: error.message }

  revalidatePath('/admin/planes')
}
