import type { SupabaseClient } from '@supabase/supabase-js'
import { todayART } from './dates'
import { suggestNextPaymentDate } from './billing'

/**
 * Precios de los planes con vigencia (tabla plan_prices).
 *
 * El precio de un plan para una fecha es el último cargado con "vigente desde" <= esa fecha.
 * Si un plan no tiene historial, se usa plans.price.
 */
export type PriceSchedule = Map<string, { validFrom: string; price: number }[]>

export type PlanPriceRow = { planId: string; validFrom: string; price: number }

export async function loadPriceSchedule(supabase: SupabaseClient): Promise<PriceSchedule> {
  const { data } = await supabase.from('plan_prices').select('plan_id, valid_from, price')
  const schedule: PriceSchedule = new Map()
  for (const r of data ?? []) {
    const list = schedule.get(r.plan_id as string) ?? []
    list.push({ validFrom: r.valid_from as string, price: Number(r.price) })
    schedule.set(r.plan_id as string, list)
  }
  // Más reciente primero.
  for (const list of schedule.values()) list.sort((a, b) => b.validFrom.localeCompare(a.validFrom))
  return schedule
}

/** Precio del plan vigente en `date` (YYYY-MM-DD, por defecto hoy en Argentina). */
export function planPriceAt(
  schedule: PriceSchedule,
  planId: string | null | undefined,
  fallback: number | string | null | undefined,
  date: string = todayART()
): number {
  const list = planId ? schedule.get(planId) : undefined
  const hit = list?.find((p) => p.validFrom <= date)
  return hit ? hit.price : Number(fallback ?? 0)
}

/** Aumento ya cargado que todavía no entró en vigencia (el más próximo), si hay. */
export function upcomingPrice(schedule: PriceSchedule, planId: string, today: string = todayART()) {
  const future = (schedule.get(planId) ?? []).filter((p) => p.validFrom > today)
  return future.length ? future[future.length - 1] : null
}

/**
 * Primer día del mes que se cobra en el próximo pago: el mes siguiente al "pagado hasta",
 * o el mes actual si no tiene nada pago. Es la fecha con la que se elige el precio de la cuota.
 */
export function chargeDate(endDate: string | null | undefined): string {
  return `${suggestNextPaymentDate(endDate ?? null).slice(0, 7)}-01`
}

/** Primer día del mes actual (Argentina). */
export function currentMonthStart(): string {
  return `${todayART().slice(0, 7)}-01`
}
