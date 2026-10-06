import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { artMonthStart, classDateTime, todayART } from '@/lib/dates'
import {
  applyLateSurcharge,
  getDisplayStatus,
  getPaymentStatus,
  subscriptionStatus,
  suggestNextPaymentDate,
} from '@/lib/billing'
import { hoursUntil, isInPast } from '@/lib/sessions'
import { daysUntilNextBirthday } from '@/lib/birthdays'
import { collectionSummary } from '@/lib/payments'

// El servidor está en UTC y el estudio en Argentina (UTC-3): estos tests fijan "ahora" para comprobar las dos zonas.
function at(isoUtc: string) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(isoUtc))
}
beforeEach(() => vi.useRealTimers())
afterEach(() => vi.useRealTimers())

describe('lib/dates', () => {
  it('hoy en Argentina: a las 22:30 del 5 de octubre (01:30 UTC del 6) sigue siendo 5', () => {
    at('2026-10-06T01:30:00Z')
    expect(todayART()).toBe('2026-10-05')
  })

  it('límites de mes en hora Argentina, también con desbordes', () => {
    expect(artMonthStart(2026, 10)).toBe('2026-10-01T00:00:00-03:00')
    expect(artMonthStart(2026, 13)).toBe('2027-01-01T00:00:00-03:00')
    expect(artMonthStart(2026, 0)).toBe('2025-12-01T00:00:00-03:00')
  })

  it('la hora de una clase es hora Argentina (18:00 son las 21:00 UTC)', () => {
    expect(classDateTime('2026-10-05', '18:00:00').toISOString()).toBe('2026-10-05T21:00:00.000Z')
    expect(classDateTime('2026-10-05', '18:00').toISOString()).toBe('2026-10-05T21:00:00.000Z')
  })
})

describe('plazo para avisar y clases pasadas', () => {
  it('faltan 9 horas para una clase de las 18:00 cuando son las 09:00 en Argentina', () => {
    at('2026-10-05T12:00:00Z') // 09:00 ART
    expect(hoursUntil('2026-10-05', '18:00:00')).toBeCloseTo(9, 5)
    expect(isInPast('2026-10-05', '18:00:00')).toBe(false)
  })

  it('con 4 horas de plazo: a las 13:30 ART todavía se puede avisar de una clase de las 18:00, a las 14:30 ya no', () => {
    at('2026-10-05T16:30:00Z') // 13:30 ART
    expect(hoursUntil('2026-10-05', '18:00:00') >= 4).toBe(true)
    at('2026-10-05T17:30:00Z') // 14:30 ART
    expect(hoursUntil('2026-10-05', '18:00:00') >= 4).toBe(false)
  })

  it('una clase de las 18:00 ya pasó a las 19:00 ART', () => {
    at('2026-10-05T22:00:00Z') // 19:00 ART
    expect(isInPast('2026-10-05', '18:00:00')).toBe(true)
  })
})

describe('fecha sugerida del pago', () => {
  it('si pagó hasta el 30/09, el nuevo "pagado hasta" es el 31/10 (no vuelve a ser el 30/09)', () => {
    expect(suggestNextPaymentDate('2026-09-30')).toBe('2026-10-31')
  })
  it('cruza el año y respeta febrero (también bisiesto)', () => {
    expect(suggestNextPaymentDate('2026-12-31')).toBe('2027-01-31')
    expect(suggestNextPaymentDate('2026-01-31')).toBe('2026-02-28')
    expect(suggestNextPaymentDate('2028-01-31')).toBe('2028-02-29')
  })
  it('sin cobertura previa, cubre el mes actual', () => {
    at('2026-10-05T15:00:00Z')
    expect(suggestNextPaymentDate(null)).toBe('2026-10-31')
  })
})

describe('estado de la cuota', () => {
  it('vencido recién cuando termina el día del vencimiento (en Argentina)', () => {
    at('2026-10-01T01:00:00Z') // 22:00 ART del 30/09: todavía no venció
    expect(getDisplayStatus('2026-09-30')).toBe('por_vencer')
    at('2026-10-01T04:00:00Z') // 01:00 ART del 01/10
    expect(getDisplayStatus('2026-09-30')).toBe('vencido')
  })

  it('al día, por vencer y sin plan', () => {
    at('2026-10-05T15:00:00Z')
    expect(getDisplayStatus('2026-10-31')).toBe('al_dia')
    expect(getDisplayStatus('2026-10-07')).toBe('por_vencer')
    expect(getDisplayStatus(null)).toBe('sin_plan')
  })

  it('con margen de gracia hasta el día 10: no hay recargo antes del 11', () => {
    at('2026-10-10T15:00:00Z')
    expect(getPaymentStatus('2026-09-30', 3, 10)).toBe('por_vencer')
    at('2026-10-11T15:00:00Z')
    expect(getPaymentStatus('2026-09-30', 3, 10)).toBe('vencido')
  })

  it('bonificados y sin suscripción', () => {
    expect(subscriptionStatus({ end_date: '2020-01-01', comp: true })).toBe('bonificado')
    expect(subscriptionStatus(null)).toBe('sin_plan')
  })

  it('el recargo del 10% solo se aplica a las vencidas', () => {
    expect(applyLateSurcharge(38000, 'vencido')).toEqual({ amount: 41800, hasSurcharge: true })
    expect(applyLateSurcharge(38000, 'al_dia')).toEqual({ amount: 38000, hasSurcharge: false })
  })
})

describe('cobranza y cumpleaños', () => {
  it('resumen de cobranza', () => {
    expect(collectionSummary(100000, 13000)).toEqual({ expected: 100000, collected: 13000, rate: 13, gap: 87000 })
    expect(collectionSummary(0, 5000).rate).toBe(0)
    expect(collectionSummary(1000, 5000).gap).toBe(0)
  })

  it('un cumpleaños de hoy no desaparece a la noche (22:30 ART = día siguiente en UTC)', () => {
    at('2026-10-06T01:30:00Z')
    expect(daysUntilNextBirthday('1990-10-05')).toBe(0)
    expect(daysUntilNextBirthday('1990-10-08')).toBe(3)
  })
})
