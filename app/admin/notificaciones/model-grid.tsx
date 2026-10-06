'use client'

import { ANNOUNCEMENT_MODELS } from './templates'

export const FREE_MODEL = 'libre'

/** Paso 2: grilla de modelos fijos + "Mensaje libre". No guarda nada: solo carga el texto en el campo. */
export function ModelGrid({ selected, onPick }: { selected: string | null; onPick: (id: string) => void }) {
  const card = (active: boolean, dashed = false) =>
    `flex min-h-[58px] items-center gap-3 rounded-[14px] border-2 p-3 text-left transition hover:shadow-[0_4px_14px_rgba(43,42,38,0.08)] md:min-h-[116px] md:flex-col md:items-start md:gap-2 ${
      active ? 'border-moss bg-moss-soft' : dashed ? 'border-dashed border-[#D9CFC0] bg-white' : 'border-edge-strong bg-white'
    }`

  return (
    <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
      {ANNOUNCEMENT_MODELS.map((m) => (
        <button key={m.id} type="button" aria-pressed={selected === m.id} onClick={() => onPick(m.id)} className={card(selected === m.id)}>
          <span
            aria-hidden
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] text-[19px] leading-none md:h-9 md:w-9"
            style={{ background: m.bg }}
          >
            {m.emoji}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold leading-tight text-ink">{m.name}</span>
            <span className="block text-xs leading-tight text-muted">{m.hint}</span>
          </span>
        </button>
      ))}
      <button type="button" aria-pressed={selected === FREE_MODEL} onClick={() => onPick(FREE_MODEL)} className={card(selected === FREE_MODEL, true)}>
        <span aria-hidden className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-edge-row text-[19px] leading-none md:h-9 md:w-9">
          ✏️
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold leading-tight text-ink">Mensaje libre</span>
          <span className="block text-xs leading-tight text-muted">Escribí lo que quieras</span>
        </span>
      </button>
    </div>
  )
}
