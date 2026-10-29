import { describe, expect, it } from 'vitest'
import { dropInTiersAt, tierPrice, upcomingDropIn, type DropInSchedule } from '@/lib/drop-in-prices'

describe('precios de clases sueltas con fecha de vigencia', () => {
  const schedule: DropInSchedule = [
    { validFrom: '2026-11-01', tiers: { 1: 12000, 2: 11000, 3: 10000, 4: 9000 } },
    { validFrom: '2000-01-01', tiers: { 1: 10000, 2: 9000, 3: 8000, 4: 7000 } },
  ]

  it('una clase de octubre va al precio viejo y una de noviembre al nuevo', () => {
    expect(tierPrice(dropInTiersAt(schedule, null, '2026-10-30'), 1)).toBe(10000)
    expect(tierPrice(dropInTiersAt(schedule, null, '2026-11-03'), 1)).toBe(12000)
  })

  it('la escala depende de cuántas clases se compran juntas', () => {
    const tiers = dropInTiersAt(schedule, null, '2026-11-03')
    expect([1, 2, 3, 4, 6].map((n) => tierPrice(tiers, n))).toEqual([12000, 11000, 10000, 9000, 9000])
  })

  it('sin historial usa los precios de la configuración del estudio', () => {
    const tiers = dropInTiersAt([], { drop_in_price_1: 15000, drop_in_price_2: 14000, drop_in_price_3: 13000, drop_in_price_4_plus: 12000 })
    expect(tiers).toEqual({ 1: 15000, 2: 14000, 3: 13000, 4: 12000 })
  })

  it('muestra el aumento programado solo mientras no rige', () => {
    expect(upcomingDropIn(schedule, '2026-10-29')?.validFrom).toBe('2026-11-01')
    expect(upcomingDropIn(schedule, '2026-11-01')).toBeNull()
  })
})
