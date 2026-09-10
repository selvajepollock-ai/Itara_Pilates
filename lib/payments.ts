import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ÚNICO punto de escritura de pagos de cuota.
 *
 *  Todo alta / anulación / edición de un pago pasa por acá. Si en el futuro se
 *  quiere reflejar cada movimiento en un Google Sheet (o en cualquier otro
 *  sistema externo), el lugar para engancharlo es al final de `recordPayment`,
 *  `voidPayment` y `updatePayment` — no hace falta tocar nada más.
 * ─────────────────────────────────────────────────────────────────────────────
 */

type Result = { error?: string }

export type RecordPaymentInput = {
  supabase: SupabaseClient
  subscriptionId: string
  amount: number
  /** Nueva fecha "pagado hasta" (YYYY-MM-DD). */
  newEndDate: string
  notes?: string | null
  /** id del admin que registra el pago. */
  recordedBy?: string | null
}

/**
 * Registra un pago de cuota y extiende la cobertura de la suscripción.
 * Devuelve `{ error }` si algo falla.
 */
export async function recordPayment({
  supabase,
  subscriptionId,
  amount,
  newEndDate,
  notes,
  recordedBy,
}: RecordPaymentInput): Promise<Result> {
  if (!newEndDate) return { error: 'Falta la nueva fecha de vencimiento.' }

  const { error: payError } = await supabase.from('payments').insert({
    subscription_id: subscriptionId,
    amount: amount || 0,
    method: 'manual',
    notes: notes?.trim() || null,
    recorded_by: recordedBy || null,
  })
  if (payError) return { error: payError.message }

  const { error: subError } = await supabase
    .from('subscriptions')
    .update({ end_date: newEndDate, status: 'active' })
    .eq('id', subscriptionId)
  if (subError) return { error: subError.message }

  // 🔌 Punto de enganche para sync externo (Google Sheet): pago registrado.
  return {}
}

export type VoidPaymentInput = {
  supabase: SupabaseClient
  paymentId: string
  reason: string
  voidedBy?: string | null
}

/**
 * Anula un pago mal cargado. No revierte la fecha de la suscripción: si además
 * hay que corregir "pagado hasta", el admin lo ajusta desde la ficha del alumno.
 */
export async function voidPayment({
  supabase,
  paymentId,
  reason,
}: VoidPaymentInput): Promise<Result> {
  const trimmed = reason.trim()
  if (!trimmed) return { error: 'Indicá el motivo de la anulación.' }

  const { error } = await supabase
    .from('payments')
    .update({ voided_at: new Date().toISOString(), voided_reason: trimmed })
    .eq('id', paymentId)
    .is('voided_at', null)
  if (error) return { error: error.message }

  // 🔌 Punto de enganche para sync externo (Google Sheet): pago anulado.
  return {}
}

export type UpdatePaymentInput = {
  supabase: SupabaseClient
  paymentId: string
  amount: number
  notes?: string | null
}

/** Corrige el monto / la nota de un pago ya registrado (no anulado). */
export async function updatePayment({
  supabase,
  paymentId,
  amount,
  notes,
}: UpdatePaymentInput): Promise<Result> {
  if (!Number.isFinite(amount) || amount < 0) return { error: 'Monto inválido.' }

  const { error } = await supabase
    .from('payments')
    .update({ amount, notes: notes?.trim() || null })
    .eq('id', paymentId)
    .is('voided_at', null)
  if (error) return { error: error.message }

  // 🔌 Punto de enganche para sync externo (Google Sheet): pago editado.
  return {}
}

/**
 * Estado de cobranza del mes: esperado (suma de precios de planes activos),
 * cobrado (pagos no anulados del período) y tasa.
 */
export function collectionSummary(expected: number, collected: number) {
  const rate = expected > 0 ? Math.round((collected / expected) * 100) : 0
  return { expected, collected, rate, gap: Math.max(expected - collected, 0) }
}
