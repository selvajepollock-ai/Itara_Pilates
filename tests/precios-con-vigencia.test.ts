import { describe, expect, it } from 'vitest'
import { chargeDate, planPriceAt, upcomingPrice, type PriceSchedule } from '@/lib/plan-prices'

describe('precios de plan con fecha de vigencia', () => {
  // Plan con precio inicial 50.000 y aumento a 60.000 desde noviembre (ya cargado en octubre).
  const schedule: PriceSchedule = new Map([
    [
      'plan-2x',
      [
        { validFrom: '2026-11-01', price: 60000 },
        { validFrom: '2000-01-01', price: 50000 },
      ],
    ],
  ])

  it('octubre mantiene el precio viejo y noviembre usa el nuevo', () => {
    expect(planPriceAt(schedule, 'plan-2x', 0, '2026-10-01')).toBe(50000)
    expect(planPriceAt(schedule, 'plan-2x', 0, '2026-11-01')).toBe(60000)
    expect(planPriceAt(schedule, 'plan-2x', 0, '2027-03-01')).toBe(60000)
  })

  it('cobrar noviembre en octubre (pagado hasta 31/10) usa el precio nuevo', () => {
    expect(chargeDate('2026-10-31')).toBe('2026-11-01')
    expect(planPriceAt(schedule, 'plan-2x', 0, chargeDate('2026-10-31'))).toBe(60000)
  })

  it('una deuda de octubre (pagado hasta 30/9) se cobra al precio viejo', () => {
    expect(chargeDate('2026-09-30')).toBe('2026-10-01')
    expect(planPriceAt(schedule, 'plan-2x', 0, chargeDate('2026-09-30'))).toBe(50000)
  })

  it('un plan sin historial usa el precio guardado en el plan', () => {
    expect(planPriceAt(schedule, 'otro-plan', 45000, '2026-11-01')).toBe(45000)
    expect(planPriceAt(schedule, null, '45000.00', '2026-11-01')).toBe(45000)
  })

  it('muestra el aumento programado solo mientras no rige', () => {
    expect(upcomingPrice(schedule, 'plan-2x', '2026-10-29')).toEqual({ validFrom: '2026-11-01', price: 60000 })
    expect(upcomingPrice(schedule, 'plan-2x', '2026-11-01')).toBeNull()
  })
})
