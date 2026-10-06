'use client'

import type { Recipient } from './templates'

export const RECIPIENT_LABEL: Record<Recipient, string> = {
  all: 'Todos',
  people: 'Personas puntuales',
  class: 'Una clase',
}

/** Paso 1: a quién va el comunicado. Tres tarjetas grandes seleccionables (radio). */
export function RecipientCards({
  value,
  onChange,
  counts,
}: {
  value: Recipient
  onChange: (r: Recipient) => void
  counts: { students: number; instructors: number }
}) {
  const options: { key: Recipient; emoji: string; help: string }[] = [
    {
      key: 'all',
      emoji: '👥',
      help: `${counts.students} ${counts.students === 1 ? 'alumno' : 'alumnos'}`,
    },
    { key: 'people', emoji: '🙋‍♀️', help: 'Una o varias personas' },
    { key: 'class', emoji: '🧘‍♀️', help: 'Los anotados en un horario' },
  ]

  return (
    <div role="radiogroup" aria-label="Destinatarios" className="grid gap-2.5 md:grid-cols-3">
      {options.map((o) => {
        const active = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.key)}
            className={`flex min-h-[60px] items-center gap-3 rounded-[14px] border-2 p-3.5 text-left transition md:flex-col md:items-start md:gap-1.5 ${
              active ? 'border-moss bg-moss-soft' : 'border-edge-strong bg-white hover:border-moss/50'
            }`}
          >
            <span className="text-[26px] leading-none" aria-hidden>
              {o.emoji}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">{RECIPIENT_LABEL[o.key]}</span>
              <span className="block text-xs text-muted">{o.help}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
