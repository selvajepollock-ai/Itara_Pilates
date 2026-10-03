'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { normalize } from '../alumnos/format'

export type Person = { username: string; name: string; role: 'alumno' | 'instructor' }

/** Chips de personas elegidas + buscador con autocompletado. Los destinatarios se guardan por usuario, como siempre. */
export function PeoplePicker({
  people,
  selected,
  onChange,
}: {
  people: Person[]
  selected: string[]
  onChange: (usernames: string[]) => void
}) {
  const [query, setQuery] = useState('')
  const text = normalize(query.trim())
  const chosen = new Set(selected)
  const matches =
    text.length === 0
      ? []
      : people.filter((p) => !chosen.has(p.username) && normalize(p.name).includes(text)).slice(0, 8)
  const byUsername = new Map(people.map((p) => [p.username, p]))

  return (
    <div className="relative">
      <div className="flex min-h-[48px] flex-wrap items-center gap-2 rounded-[12px] border border-edge-strong bg-white p-2 focus-within:border-moss">
        {selected.map((u) => {
          const name = byUsername.get(u)?.name ?? u
          return (
            <span
              key={u}
              className="inline-flex items-center gap-1 rounded-full bg-slot-free py-1 pl-3 pr-1 text-sm font-medium text-slot-free-ink"
            >
              {name}
              <button
                type="button"
                aria-label={`Quitar a ${name}`}
                onClick={() => onChange(selected.filter((x) => x !== u))}
                className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white/60"
              >
                <X size={13} />
              </button>
            </span>
          )
        })}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Agregar alumno o instructor…"
          aria-label="Agregar alumno o instructor"
          className="min-w-[180px] flex-1 bg-transparent px-1 py-1 text-sm text-ink outline-none"
        />
      </div>

      {matches.length > 0 && (
        <ul className="surface-card absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto p-1.5">
          {matches.map((p) => (
            <li key={p.username}>
              <button
                type="button"
                onClick={() => {
                  onChange([...selected, p.username])
                  setQuery('')
                }}
                className="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-[8px] px-3 text-left text-sm hover:bg-moss-soft"
              >
                <span className="text-ink">{p.name}</span>
                <span className="text-xs text-muted">{p.role === 'instructor' ? 'Instructor' : 'Alumno'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {text.length > 0 && matches.length === 0 && (
        <p className="mt-1 text-xs text-muted">Sin coincidencias (solo se pueden elegir personas con usuario).</p>
      )}
    </div>
  )
}
