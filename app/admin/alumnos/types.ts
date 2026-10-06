import type { PaymentStatus } from '@/lib/billing'

export type StudentRow = {
  id: string
  fullName: string
  nickname: string | null
  /** Email de la cuenta (puede ser el interno "sin acceso"). */
  email: string
  /** Email real de contacto, si lo hay. */
  displayEmail: string | null
  hasAccess: boolean
  phone: string | null
  active: boolean
  status: PaymentStatus
  /** Vencido que además ya pasó el margen de gracia (se le suma recargo). */
  hasSurcharge: boolean
  /** Cuota con recargo, si aplica. */
  surchargeAmount: number | null
  planId: string | null
  planName: string | null
  planPrice: number
  subscriptionId: string | null
  /** "Pagado hasta" (YYYY-MM-DD) */
  endDate: string | null
  comp: boolean
  instructorId: string | null
  instructorName: string | null
  /** Timestamp del último pago no anulado, si se pudo leer. */
  lastPaymentAt: string | null
  /** Clases sueltas vigentes (pendientes de cobro o con fecha futura). */
  dropInCount: number
  /** De esas, cuántas todavía no se cobraron. */
  dropInUnpaid: number
}

export type PlanOption = { id: string; name: string }

// Los links viejos (Pagos, Inicio) usan guion bajo; el diseño usa todo junto. Se aceptan ambos.
export const ESTADO_FROM_PARAM: Record<string, PaymentStatus> = {
  vencido: 'vencido',
  aldia: 'al_dia',
  al_dia: 'al_dia',
  porvencer: 'por_vencer',
  por_vencer: 'por_vencer',
  sinplan: 'sin_plan',
  sin_plan: 'sin_plan',
  bonificado: 'bonificado',
  sueltas: 'sueltas',
}

export const ESTADO_TO_PARAM: Record<PaymentStatus, string> = {
  vencido: 'vencido',
  al_dia: 'aldia',
  por_vencer: 'porvencer',
  sin_plan: 'sinplan',
  bonificado: 'bonificado',
  sueltas: 'sueltas',
}

// Orden de las chips de estado (después de "Todos").
export const ESTADO_ORDER: PaymentStatus[] = ['vencido', 'al_dia', 'sin_plan', 'sueltas', 'bonificado', 'por_vencer']

export const PAGE_SIZE = 25
