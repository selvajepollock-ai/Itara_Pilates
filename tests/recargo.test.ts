import { describe, expect, it } from 'vitest'
import { isFirstMonth, surchargeWaiver } from '@/lib/billing'

describe('recargo: primer mes y perdón', () => {
  const today = '2026-10-20'

  it('un alumno dado de alta este mes no paga recargo ese primer mes', () => {
    const sub = { end_date: '2026-09-30', created_at: '2026-10-15T15:00:00Z' }
    expect(isFirstMonth(sub, today)).toBe(true)
    expect(surchargeWaiver(sub, today)).toBe('primer_mes')
  })

  it('desde el mes siguiente corre la regla normal', () => {
    const sub = { end_date: '2026-09-30', created_at: '2026-10-15T15:00:00Z' }
    expect(surchargeWaiver(sub, '2026-11-12')).toBeNull()
  })

  it('un alta de otro mes no está en su primer mes', () => {
    expect(surchargeWaiver({ end_date: '2026-09-30', created_at: '2026-08-10T15:00:00Z' }, today)).toBeNull()
  })

  it('el día del alta cuenta en hora Argentina (22:30 del último día del mes anterior)', () => {
    // 2026-10-01T01:30Z es el 30/09 a las 22:30 en Argentina: el alta es de septiembre.
    expect(isFirstMonth({ created_at: '2026-10-01T01:30:00Z' }, '2026-10-20')).toBe(false)
    expect(isFirstMonth({ created_at: '2026-10-01T04:00:00Z' }, '2026-10-20')).toBe(true)
  })

  it('el perdón manual vale solo para la cuota perdonada: al pagar cambia el "pagado hasta" y deja de valer', () => {
    const waived = { end_date: '2026-09-30', created_at: '2026-01-05T15:00:00Z', surcharge_waived_end_date: '2026-09-30' }
    expect(surchargeWaiver(waived, today)).toBe('manual')
    expect(surchargeWaiver({ ...waived, end_date: '2026-10-31' }, today)).toBeNull()
  })

  it('sin suscripción no hay nada que perdonar', () => {
    expect(surchargeWaiver(null, today)).toBeNull()
  })
})
