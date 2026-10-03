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
type VoidResult = { error?: string; revertedEndDate?: string | null; skippedRevert?: boolean }

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

  const { data: currentSub } = await supabase
    .from('subscriptions')
    .select('end_date')
    .eq('id', subscriptionId)
    .maybeSingle()

  // Defensa contra el doble envío (doble click, red lenta): un pago idéntico de hace menos de 2 minutos no se repite.
  const since = new Date(Date.now() - 2 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from('payments')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('amount', amount || 0)
    .is('voided_at', null)
    .gte('paid_at', since)
    .limit(1)
  if (recent && recent.length > 0) return {}

  const { error: payError } = await supabase.from('payments').insert({
    subscription_id: subscriptionId,
    amount: amount || 0,
    method: 'manual',
    notes: notes?.trim() || null,
    recorded_by: recordedBy || null,
    // Para poder revertir el "pagado hasta" si este pago se anula por error.
    previous_end_date: currentSub?.end_date ?? null,
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
 * Anula un pago mal cargado. Si es el pago más reciente de esa suscripción (no
 * hay otro pago sin anular después) y quedó guardada la fecha anterior, revierte
 * el "pagado hasta" a lo que estaba antes de este pago -- así el alumno vuelve a
 * mostrar el estado real (ej: vencido) en vez de quedar "al día" por error.
 */
export async function voidPayment({
  supabase,
  paymentId,
  reason,
}: VoidPaymentInput): Promise<VoidResult> {
  const trimmed = reason.trim()
  if (!trimmed) return { error: 'Indicá el motivo de la anulación.' }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, subscription_id, paid_at, previous_end_date, voided_at')
    .eq('id', paymentId)
    .maybeSingle()

  if (!payment) return { error: 'Ese pago ya no existe.' }
  if (payment.voided_at) return { error: 'Ese pago ya estaba anulado.' }

  const { error } = await supabase
    .from('payments')
    .update({ voided_at: new Date().toISOString(), voided_reason: trimmed })
    .eq('id', paymentId)
    .is('voided_at', null)
  if (error) return { error: error.message }

  if (payment.previous_end_date === null) {
    // 🔌 Punto de enganche para sync externo (Google Sheet): pago anulado.
    return {}
  }

  const { count: laterPayments } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .eq('subscription_id', payment.subscription_id)
    .is('voided_at', null)
    .gt('paid_at', payment.paid_at)

  if (laterPayments) {
    return { skippedRevert: true }
  }

  await supabase
    .from('subscriptions')
    .update({ end_date: payment.previous_end_date })
    .eq('id', payment.subscription_id)

  // 🔌 Punto de enganche para sync externo (Google Sheet): pago anulado.
  return { revertedEndDate: payment.previous_end_date }
}

export type UpdatePaymentInput = {
  supabase: SupabaseClient
  paymentId: string
  amount: number
  notes?: string | null
  /** Fecha real del pago (YYYY-MM-DD). Si viene, corrige paid_at. */
  paidDate?: string | null
}

/** Corrige el monto, la fecha o la nota de un pago ya registrado (no anulado). */
export async function updatePayment({
  supabase,
  paymentId,
  amount,
  notes,
  paidDate,
}: UpdatePaymentInput): Promise<Result> {
  if (!Number.isFinite(amount) || amount < 0) return { error: 'Monto inválido.' }
  if (paidDate && !/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) return { error: 'Fecha inválida.' }

  // Mediodía de Argentina (UTC-3) para que la fecha no se corra de día por la zona horaria.
  const { error } = await supabase
    .from('payments')
    .update({
      amount,
      notes: notes?.trim() || null,
      ...(paidDate ? { paid_at: `${paidDate}T12:00:00-03:00` } : {}),
    })
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
