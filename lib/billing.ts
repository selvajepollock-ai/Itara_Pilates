export type PaymentStatus = 'al_dia' | 'por_vencer' | 'vencido' | 'sin_plan'

export function getPaymentStatus(
  endDate: string | null,
  reminderDaysBefore: number = 3
): PaymentStatus {
  if (!endDate) return 'sin_plan'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(`${endDate}T00:00:00`)

  const diffDays = Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

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

// Sugiere la próxima fecha "pagado hasta", basada en el día de corte global del estudio
export function suggestNextDueDate(fromDate: Date, dueDay: number): string {
  const next = new Date(fromDate.getFullYear(), fromDate.getMonth() + 1, dueDay)
  return next.toISOString().slice(0, 10)
}
