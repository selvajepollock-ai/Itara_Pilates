import type { SupabaseClient } from '@supabase/supabase-js'
import { todayART } from './dates'

/**
 * Precios de clases sueltas con vigencia (tabla drop_in_prices).
 *
 * El precio de una clase es el de la escala vigente en la fecha de la clase.
 * Si no hay historial, se usan los precios de studio_settings.
 */
export type DropInTiers = { 1: number; 2: number; 3: number; 4: number }

export type DropInSchedule = { validFrom: string; tiers: DropInTiers }[]

type SettingsPrices = {
  drop_in_price_1?: number | string | null
  drop_in_price_2?: number | string | null
  drop_in_price_3?: number | string | null
  drop_in_price_4_plus?: number | string | null
} | null | undefined

export async function loadDropInSchedule(supabase: SupabaseClient): Promise<DropInSchedule> {
  const { data } = await supabase.from('drop_in_prices').select('valid_from, price_1, price_2, price_3, price_4_plus')
  return (data ?? [])
    .map((r) => ({
      validFrom: r.valid_from as string,
      tiers: { 1: Number(r.price_1), 2: Number(r.price_2), 3: Number(r.price_3), 4: Number(r.price_4_plus) },
    }))
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom))
}

/** Escala vigente en `date` (YYYY-MM-DD, por defecto hoy en Argentina). */
export function dropInTiersAt(schedule: DropInSchedule, settings: SettingsPrices, date: string = todayART()): DropInTiers {
  const hit = schedule.find((p) => p.validFrom <= date)
  if (hit) return hit.tiers
  return {
    1: Number(settings?.drop_in_price_1 ?? 10000),
    2: Number(settings?.drop_in_price_2 ?? 9000),
    3: Number(settings?.drop_in_price_3 ?? 8000),
    4: Number(settings?.drop_in_price_4_plus ?? 7000),
  }
}

/** Aumento ya cargado que todavía no rige (el más próximo), si hay. */
export function upcomingDropIn(schedule: DropInSchedule, today: string = todayART()) {
  const future = schedule.filter((p) => p.validFrom > today)
  return future.length ? future[future.length - 1] : null
}

/** Precio por clase según cuántas se compran juntas en la tanda. */
export function tierPrice(tiers: DropInTiers, count: number) {
  return count <= 1 ? tiers[1] : count === 2 ? tiers[2] : count === 3 ? tiers[3] : tiers[4]
}

export function sameTiers(a: DropInTiers, b: DropInTiers) {
  return a[1] === b[1] && a[2] === b[2] && a[3] === b[3] && a[4] === b[4]
}
