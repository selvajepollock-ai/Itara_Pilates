export type PaymentStatus = 'al_dia' | 'por_vencer' | 'vencido' | 'sin_plan'

// endDate = último día del mes que ya está pagado (ej: 31/08 si pagó agosto).
// Hay margen hasta el día `graceDay` del mes SIGUIENTE para pagar el mes que viene
// sin que se considere vencido (como el resumen de una tarjeta de crédito).
export function getPaymentStatus(
  endDate: string | null,
  reminderDaysBefore: number = 3,
  graceDay: number = 10
): PaymentStatus {
  if (!endDate) return 'sin_plan'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(`${endDate}T00:00:00`)

  const graceDeadline = new Date(end.getFullYear(), end.getMonth() + 1, graceDay)
  graceDeadline.setHours(0, 0, 0, 0)

  const diffDays = Math.round((graceDeadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'vencido'
  if (diffDays <= reminderDaysBefore) return 'por_vencer'
  return 'al_dia'
}

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  al_dia: 'Al día',
  por_vencer: 'Por vencer',
  vencido: 'Vencido',
  sin_plan: 'Sin plan',
}

export const STATUS_CLASSES: Record<PaymentStatus, string> = {
  al_dia: 'bg-moss/10 text-moss-dark',
  por_vencer: 'bg-clay/10 text-clay',
  vencido: 'bg-clay text-white',
  sin_plan: 'bg-sand text-ink/50',
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
  const base = currentEndDate ? new Date(`${currentEndDate}T00:00:00`) : new Date()
  const monthsToAdd = currentEndDate ? 2 : 1
  const endOfTargetMonth = new Date(base.getFullYear(), base.getMonth() + monthsToAdd, 0)
  return endOfTargetMonth.toISOString().slice(0, 10)
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
