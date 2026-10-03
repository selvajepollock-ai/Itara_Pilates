'use client'

import { useMoneyHidden } from '../privacy'
import { formatARS } from '@/lib/currency'
import { addDaysISO } from '../../horarios/slots'
import { dayNumber, shortMoney } from './format'

const HEAD = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

/** Calendario del mes: los días con cobros se pintan con su total. Click selecciona el día. */
export function PayCalendar({
  month,
  today,
  totals,
  selected,
  onSelect,
}: {
  month: string
  today: string
  /** yyyy-mm-dd → total cobrado ese día (con los filtros activos). */
  totals: Record<string, number>
  selected: string | null
  onSelect: (day: string | null) => void
}) {
  const hidden = useMoneyHidden()
  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const lead = (new Date(`${first}T12:00:00Z`).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => addDaysISO(first, i)),
  ]

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted" aria-hidden>
        {HEAD.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} />
          const total = totals[day] ?? 0
          const future = day > today
          const isSelected = selected === day
          const isToday = day === today
          const label = `${dayNumber(day)} de ${LONG[m - 1]}${
            total > 0 ? `, ${hidden ? 'monto oculto' : formatARS(total)}` : ', sin cobros'
          }`
          return (
            <button
              key={day}
              type="button"
              disabled={future}
              aria-label={label}
              aria-pressed={isSelected}
              onClick={() => onSelect(isSelected ? null : day)}
              className={`flex h-12 flex-col items-center justify-center rounded-[8px] text-xs transition ${
                isSelected
                  ? 'bg-moss text-white'
                  : total > 0
                    ? 'bg-slot-free text-slot-free-ink hover:shadow-[inset_0_0_0_2px_#CFDDD1]'
                    : 'text-ink hover:bg-moss-soft'
              } ${future ? 'cursor-not-allowed text-muted/40 hover:bg-transparent' : ''} ${
                isToday && !isSelected ? 'shadow-[inset_0_0_0_2px_#5B7561]' : ''
              }`}
            >
              <span className="font-semibold tabular-nums">{dayNumber(day)}</span>
              {total > 0 && (
                <span className="text-[9px] leading-none tabular-nums">{hidden ? '••' : shortMoney(total)}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
