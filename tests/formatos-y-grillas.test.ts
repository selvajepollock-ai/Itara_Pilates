import { describe, expect, it } from 'vitest'
import { formatPhoneDisplay } from '@/lib/phone'
import { whatsappLink } from '@/lib/whatsapp'
import { addDaysISO, buildRows, cellInfo, mondayOf, shortName, visibleDays, weekRange } from '@/app/admin/horarios/slots'
import type { ClassItem, OccurrenceData } from '@/app/admin/horarios/types'
import { dayDate, deadlineText, formatHours, rangeText } from '@/app/alumno/format'
import { buildBuckets, rangeLabel, resolvePeriod, variation } from '@/app/admin/reportes/format'
import { dayTitle, shortMoney } from '@/app/admin/pagos/registro/format'

describe('teléfonos', () => {
  it('se muestran sin +54 ni el 9, con la característica separada', () => {
    expect(formatPhoneDisplay('+54 9 3751 525946')).toBe('3751 52-5946')
    expect(formatPhoneDisplay('3794678267')).toBe('379 467-8267')
    expect(formatPhoneDisplay('1123456789')).toBe('11 2345-6789')
    expect(formatPhoneDisplay(null)).toBeNull()
  })
  it('el link de WhatsApp antepone 549 solo si hace falta y descarta números cortos', () => {
    expect(whatsappLink('3794678267')).toBe('https://wa.me/5493794678267')
    expect(whatsappLink('+54 9 379 4678267')).toBe('https://wa.me/5493794678267')
    expect(whatsappLink('12345')).toBeNull()
  })
})

describe('semana y grilla de horarios', () => {
  it('lunes de cualquier día de la semana (el domingo cuenta para la semana anterior)', () => {
    expect(mondayOf('2026-10-07')).toBe('2026-10-05')
    expect(mondayOf('2026-10-11')).toBe('2026-10-05')
    expect(mondayOf('2026-10-05')).toBe('2026-10-05')
    expect(addDaysISO('2026-10-31', 1)).toBe('2026-11-01')
  })
  it('rango de la semana en es-AR', () => {
    expect(weekRange('2026-09-28', 5)).toBe('28 sep – 2 oct 2026')
    expect(weekRange('2026-10-05', 5)).toBe('5 – 9 oct 2026')
  })
  it('nombres cortos', () => {
    expect(shortName('Karina Horianski')).toBe('Karina H.')
    expect(shortName('Ana')).toBe('Ana')
  })

  const cls = (over: Partial<ClassItem>): ClassItem => ({
    id: 'c1', dow: 1, start: '08:00', end: '09:00', capacity: 8, typeName: 'Reformer', instructorName: null, fixed: [], ...over,
  })
  const fixed = (n: number) => Array.from({ length: n }, (_, i) => ({ enrollmentId: `e${i}`, studentId: `s${i}`, name: `Alumno ${i}` }))

  it('cupo de una clase: fijos − avisaron + recuperan', () => {
    const c = cls({ fixed: fixed(6) })
    const occ: OccurrenceData = {
      cancelled: { 'c1|2026-10-05': ['e0'] },
      recovering: { 'c1|2026-10-05': [{ studentId: 'x', name: 'X' }] },
      wholeCancelled: [],
    }
    const info = cellInfo(c, '2026-10-05', occ)
    expect(info.attending).toBe(6)
    expect(info.fixedFree).toBe(2)
    expect(info.freed).toBe(0) // el lugar liberado ya lo ocupó la recuperación
  })
  it('un lugar liberado sin recuperación queda "para recuperar"', () => {
    const c = cls({ fixed: fixed(8) })
    const info = cellInfo(c, '2026-10-05', { cancelled: { 'c1|2026-10-05': ['e0'] }, recovering: {}, wholeCancelled: [] })
    expect(info.freed).toBe(1)
    expect(info.attending).toBe(7)
  })
  it('una clase cancelada por el estudio no cuenta lugares', () => {
    const info = cellInfo(cls({ fixed: fixed(5) }), '2026-10-05', { cancelled: {}, recovering: {}, wholeCancelled: ['c1|2026-10-05'] })
    expect(info.cancelledWhole).toBe(true)
    expect(info.attending).toBe(0)
    expect(info.freed).toBe(0)
  })
  it('las franjas sin clases se colapsan y el fin de semana se oculta', () => {
    const classes = [cls({ id: 'a', start: '08:00', end: '09:00' }), cls({ id: 'b', start: '18:00', end: '19:00' })]
    const rows = buildRows(classes, visibleDays(classes))
    expect(rows.map((r) => r.kind)).toEqual(['time', 'gap', 'time'])
    expect(visibleDays(classes)).toEqual([1, 2, 3, 4, 5])
    expect(visibleDays([...classes, cls({ id: 'c', dow: 6 })])).toEqual([1, 2, 3, 4, 5, 6, 0])
  })
})

describe('textos del panel de la alumna', () => {
  it('hora límite para avisar según el plazo configurado', () => {
    expect(deadlineText('18:00', 4)).toBe('las 14:00')
    expect(deadlineText('18:00', 2)).toBe('las 16:00')
    expect(deadlineText('02:00', 4)).toBe('4 h antes')
    expect(formatHours(1.5)).toBe('1,5 h')
  })
  it('fechas en español', () => {
    expect(dayDate('2026-10-05')).toBe('lunes 5')
    expect(rangeText('2026-10-05', '2026-10-09')).toBe('5 al 9 de octubre')
    expect(rangeText('2026-09-28', '2026-10-02')).toBe('28 de septiembre al 2 de octubre')
  })
})

describe('períodos de Reportes', () => {
  const today = '2026-10-05'
  it('este mes se compara con el mes anterior', () => {
    const p = resolvePeriod({}, today)
    expect([p.from, p.to, p.prevFrom, p.prevTo, p.prevLabel]).toEqual(['2026-10-01', '2026-10-31', '2026-09-01', '2026-09-30', 'septiembre'])
  })
  it('mes anterior, últimos 3 meses y año', () => {
    const a = resolvePeriod({ periodo: 'anterior' }, today)
    expect([a.from, a.to, a.prevFrom, a.prevTo]).toEqual(['2026-09-01', '2026-09-30', '2026-08-01', '2026-08-31'])
    const m3 = resolvePeriod({ periodo: '3m' }, today)
    expect([m3.from, m3.to, m3.prevFrom, m3.prevTo]).toEqual(['2026-08-01', '2026-10-31', '2026-05-01', '2026-07-31'])
    const y = resolvePeriod({ periodo: 'anio' }, today)
    expect([y.from, y.to, y.prevFrom, y.prevTo]).toEqual(['2026-01-01', '2026-12-31', '2025-01-01', '2025-12-31'])
  })
  it('fechas personalizadas: el período anterior dura lo mismo', () => {
    const p = resolvePeriod({ desde: '2026-10-01', hasta: '2026-10-10' }, today)
    expect([p.key, p.prevFrom, p.prevTo]).toEqual(['custom', '2026-09-21', '2026-09-30'])
  })
  it('variación y rango', () => {
    expect(variation(120, 100)).toBe(20)
    expect(variation(80, 100)).toBe(-20)
    expect(variation(5, 0)).toBeNull()
    expect(rangeLabel('2026-10-01', '2026-10-31')).toBe('1 – 31 oct 2026')
  })
  it('ingresos por día: un casillero por día y la suma por fecha', () => {
    const p = resolvePeriod({}, today)
    const buckets = buildBuckets(
      [
        { date: '2026-10-02', amount: 38000 },
        { date: '2026-10-02', amount: 10000 },
        { date: '2026-10-03', amount: 5000 },
      ],
      p,
      today
    )
    expect(buckets).toHaveLength(31)
    expect(buckets.find((b) => b.key === '2026-10-02')).toMatchObject({ total: 48000, count: 2 })
    expect(buckets.find((b) => b.key === '2026-10-20')?.future).toBe(true)
  })
})

describe('Pagos: formatos', () => {
  it('montos abreviados', () => {
    expect(shortMoney(432000)).toBe('$432k')
    expect(shortMoney(1500000)).toBe('$1,5M')
    expect(shortMoney(2000000)).toBe('$2M')
    expect(shortMoney(500)).toBe('$500')
  })
  it('título del día', () => {
    expect(dayTitle('2026-10-02')).toBe('Viernes 2 de octubre')
  })
})
