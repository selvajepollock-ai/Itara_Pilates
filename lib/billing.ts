import { todayART } from './dates'

// 'sueltas': sin plan mensual pero con clases sueltas compradas (se asigna al armar la lista de alumnos).
export type PaymentStatus = 'al_dia' | 'por_vencer' | 'vencido' | 'sin_plan' | 'bonificado' | 'sueltas'

// Estado a mostrar para una suscripción, contemplando el "sin cargo" (bonificado),
// que ignora la fecha de vencimiento porque no se factura.
export function subscriptionStatus(
  sub: { end_date: string | null; comp?: boolean | null } | null | undefined,
  reminderDaysBefore?: number,
  graceDay?: number
): PaymentStatus {
  if (!sub) return 'sin_plan'
  if (sub.comp) return 'bonificado'
  return getPaymentStatus(sub.end_date ?? null, reminderDaysBefore, graceDay)
}

// endDate = último día del mes que ya está pagado (ej: 31/08 si pagó agosto).
// Hay margen hasta el día `graceDay` del mes SIGUIENTE para pagar el mes que viene
// sin que se considere vencido (como el resumen de una tarjeta de crédito).
export function getPaymentStatus(
  endDate: string | null,
  reminderDaysBefore: number = 3,
  graceDay: number = 10
): PaymentStatus {
  if (!endDate) return 'sin_plan'

  // "Hoy" en hora Argentina (el servidor está en UTC).
  const today = new Date(`${todayART()}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  const graceDeadline = new Date(end.getFullYear(), end.getMonth() + 1, graceDay)
  graceDeadline.setHours(0, 0, 0, 0)

  const diffDays = Math.round((graceDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'vencido'
  if (diffDays <= reminderDaysBefore) return 'por_vencer'
  return 'al_dia'
}

// Estado que VE Vane en las listas: informativo, sigue el mes calendario, sin
// el margen de gracia (eso es aparte, para el recargo real -- ver getPaymentStatus).
// "Vencido" apenas termina el mes que ya pagó, "por vencer" unos días antes de que
// termine (mismo ajuste que ya usan para el recordatorio).
export function getDisplayStatus(endDate: string | null, reminderDaysBefore: number = 3): PaymentStatus {
  if (!endDate) return 'sin_plan'

  const today = new Date(`${todayART()}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'vencido'
  if (diffDays <= reminderDaysBefore) return 'por_vencer'
  return 'al_dia'
}

export function subscriptionDisplayStatus(
  sub: { end_date: string | null; comp?: boolean | null } | null | undefined,
  reminderDaysBefore?: number
): PaymentStatus {
  if (!sub) return 'sin_plan'
  if (sub.comp) return 'bonificado'
  return getDisplayStatus(sub.end_date ?? null, reminderDaysBefore)
}

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  al_dia: 'Al día',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  sin_plan: 'Sin plan',
  bonificado: 'Bonificado',
  sueltas: 'Clases sueltas',
}

export const STATUS_CLASSES: Record<PaymentStatus, string> = {
  al_dia: 'bg-moss/10 text-moss-dark',
  por_vencer: 'bg-clay/10 text-clay',
  vencido: 'bg-clay text-white',
  sin_plan: 'bg-sand text-ink/50',
  bonificado: 'bg-blush text-ink/70',
  sueltas: 'bg-info-soft text-info-ink',
}

// Sugiere "pagado hasta" = último día del mes actual (se paga el mes completo, como un banco).
export function suggestNextDueDate(fromDate: Date, _dueDay?: number): string {
  const endOfMonth = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, 0)
  return endOfMonth.toISOString().slice(0, 10)
}

// Para REGISTRAR UN PAGO NUEVO sobre una suscripción existente: extiende al mes
// siguiente al que ya tiene cubierto (no repite el mismo mes). Si no tiene cobertura
// previa, cubre el mes actual (como un alta nueva).
export function suggestNextPaymentDate(currentEndDate: string | null): string {
  const [y, m] = (currentEndDate ?? todayART()).split('-').map(Number)
  // Con cobertura previa: fin del mes siguiente. Sin cobertura: fin del mes actual.
  const monthsAhead = currentEndDate ? 1 : 0
  return new Date(Date.UTC(y, m - 1 + monthsAhead + 1, 0)).toISOString().slice(0, 10)
}

// Si ya venció el margen de gracia, se le suma el recargo (10% por default) a la cuota.
export function applyLateSurcharge(
  baseAmount: number,
  status: PaymentStatus,
  surchargeRate: number = 0.1
): { amount: number; hasSurcharge: boolean } {
  if (status !== 'vencido') return { amount: baseAmount, hasSurcharge: false }
  return { amount: Math.round(baseAmount * (1 + surchargeRate)), hasSurcharge: true }
}
