'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { recordPayment, voidPayment, updatePayment } from '@/lib/payments'

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

function revalidatePayments(studentId?: string) {
  if (studentId) revalidatePath(`/admin/alumnos/${studentId}`)
  revalidatePath('/admin/alumnos')
  revalidatePath('/admin')
  revalidatePath('/admin/pagos')
  revalidatePath('/admin/pagos/cuotas')
  revalidatePath('/admin/reportes')
}

/**
 * Asigna (o cambia) el plan activo de un alumno. Vive acá porque plan y cobranza
 * son la misma unidad de trabajo para el admin.
 */
export async function assignPlan(studentId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const plan_id = String(formData.get('plan_id') ?? '')
  const comp = formData.get('comp') === 'on'
  const comp_reason = String(formData.get('comp_reason') ?? '').trim() || null
  // Bonificado no necesita fecha de pago: se guarda una lejana solo para cumplir el schema.
  const end_date = comp
    ? String(formData.get('end_date') ?? '') || '2999-12-31'
    : String(formData.get('end_date') ?? '')

  if (!plan_id) return { error: 'Elegí un plan.' }
  if (!comp && !end_date) return { error: 'Elegí hasta cuándo está paga la cuota.' }

  const { data: existing } = await auth.supabase
    .from('subscriptions')
    .select('id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .maybeSingle()

  const fields = { plan_id, end_date, comp, comp_reason: comp ? comp_reason : null }

  if (existing) {
    const { error } = await auth.supabase.from('subscriptions').update(fields).eq('id', existing.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await auth.supabase.from('subscriptions').insert({
      student_id: studentId,
      status: 'active',
      ...fields,
    })
    if (error) return { error: error.message }
  }

  revalidatePayments(studentId)
  return { success: true }
}

/** Registra un pago de cuota. Usado desde la ficha del alumno, el widget de inicio y /admin/pagos. */
export async function registerPayment(subscriptionId: string, studentId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const result = await recordPayment({
    supabase: auth.supabase,
    subscriptionId,
    amount: Number(formData.get('amount') ?? 0),
    newEndDate: String(formData.get('new_end_date') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    recordedBy: auth.userId,
  })
  if (result.error) return { error: result.error }

  revalidatePayments(studentId)
  return { success: true }
}

/** Anula un pago mal cargado (queda registrado el motivo, no se borra). */
export async function annulPayment(paymentId: string, reason: string) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const result = await voidPayment({ supabase: auth.supabase, paymentId, reason, voidedBy: auth.userId })
  if (result.error) return { error: result.error }

  revalidatePayments()
  return { success: true }
}

/** Corrige el monto o la nota de un pago ya registrado. */
export async function editPayment(paymentId: string, formData: FormData) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const result = await updatePayment({
    supabase: auth.supabase,
    paymentId,
    amount: Number(formData.get('amount') ?? 0),
    notes: String(formData.get('notes') ?? ''),
  })
  if (result.error) return { error: result.error }

  revalidatePayments()
  return { success: true }
}

/** Marca un cargo extra (clase suelta) como pagado o pendiente. */
export async function setExtraChargePaid(chargeId: string, paid: boolean) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const { error } = await auth.supabase
    .from('extra_charges')
    .update({ paid, paid_at: paid ? new Date().toISOString() : null, comp: false })
    .eq('id', chargeId)
  if (error) return { error: error.message }

  revalidatePath('/admin/pagos/sueltas')
  revalidatePath('/admin/reportes')
  revalidatePath('/admin/alumnos')
  return { success: true }
}

/** Marca una clase suelta como bonificada (no se cobra) o la vuelve a pendiente. */
export async function setExtraChargeComp(chargeId: string, comp: boolean) {
  const auth = await assertAdmin()
  if (!auth.ok) return { error: auth.error }

  const { error } = await auth.supabase
    .from('extra_charges')
    .update({ comp, paid: false, paid_at: null })
    .eq('id', chargeId)
  if (error) return { error: error.message }

  revalidatePath('/admin/pagos/sueltas')
  revalidatePath('/admin/reportes')
  revalidatePath('/admin/alumnos')
  return { success: true }
}
