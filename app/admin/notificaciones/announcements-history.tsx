'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RotateCcw, Trash2 } from 'lucide-react'
import { DropdownMenu, type MenuItem } from '@/app/components/dropdown-menu'
import { deleteAnnouncement, reactivateAnnouncement } from './actions'

export type HistoryItem = {
  id: string
  message: string
  /** "hoy" o "28 sep" */
  publishedLabel: string
  /** "se oculta el 9 oct" o "sin vencimiento" */
  expiresLabel: string
  recipient: string
  hidden: boolean
}

type Filter = 'visibles' | 'ocultos' | 'todos'

export function AnnouncementsHistory({ items }: { items: HistoryItem[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<Filter>('visibles')
  const [, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const shown = items.filter((a) => filter === 'todos' || (filter === 'ocultos' ? a.hidden : !a.hidden))

  function remove(a: HistoryItem) {
    if (!confirm('¿Eliminar este comunicado? No se puede deshacer.')) return
    setError(null)
    startTransition(async () => {
      const res = await deleteAnnouncement(a.id)
      if (res?.error) setError(res.error)
      router.refresh()
    })
  }

  function reactivate(a: HistoryItem) {
    setError(null)
    startTransition(async () => {
      const res = await reactivateAnnouncement(a.id)
      if (res?.error) setError(res.error)
      router.refresh()
    })
  }

  const menuFor = (a: HistoryItem): MenuItem[] => [
    ...(a.hidden ? [{ key: 'reactivate', label: 'Reactivar', icon: <RotateCcw size={15} />, onSelect: () => reactivate(a) }] : []),
    { key: 'delete', label: 'Eliminar', icon: <Trash2 size={15} />, danger: true, onSelect: () => remove(a) },
  ]

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[22px] font-normal italic leading-tight text-ink">Publicados</h2>
        <div role="tablist" aria-label="Filtro de comunicados" className="inline-flex gap-1 rounded-[12px] bg-edge-row p-1">
          {(
            [
              ['visibles', 'Visibles'],
              ['ocultos', 'Ocultos'],
              ['todos', 'Todos'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={filter === key}
              onClick={() => setFilter(key)}
              className={`min-h-[36px] rounded-[9px] px-3.5 text-sm transition ${
                filter === key ? 'bg-white font-semibold text-ink shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <div className="surface-card mt-4">
        {shown.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-muted">No hay comunicados en esta vista.</p>
        ) : (
          <ul>
            {shown.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 border-t border-edge-row px-5 py-4 first:border-t-0">
                <div className="min-w-0">
                  <p className={`text-[15px] leading-snug ${a.hidden ? 'text-muted' : 'text-ink'}`}>{a.message}</p>
                  <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        a.hidden ? 'bg-slot-full text-slot-full-ink' : 'bg-slot-free text-slot-free-ink'
                      }`}
                    >
                      {a.hidden ? 'Oculto' : 'Visible'}
                    </span>
                    <span className="rounded-full bg-edge-row px-2 py-0.5 text-[11px] font-semibold text-ink">{a.recipient}</span>
                    <span>
                      Publicado {a.publishedLabel} · {a.expiresLabel}
                    </span>
                  </p>
                </div>
                <DropdownMenu label="Más acciones del comunicado" items={menuFor(a)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
