'use client'

import Link from 'next/link'
import { StatusChip, type ChipTone } from '@/app/components/status-chip'
import { ProgressBar } from '@/app/components/progress-bar'
import {
  deriveClasses,
  formatMinutesToStart,
  useNowMinutes,
  type ClassState,
  type DerivedClass,
  type TodayClass,
} from './today-status'

const CHIP: Record<ClassState, { tone: ChipTone; label: (c: DerivedClass) => string }> = {
  cancelada: { tone: 'danger', label: () => 'Cancelada' },
  finalizada: { tone: 'neutral', label: () => 'Finalizada' },
  en_curso: { tone: 'success', label: () => 'En curso' },
  proxima: { tone: 'info', label: (c) => formatMinutesToStart(c.minutesToStart) },
  completa: { tone: 'terracotta', label: () => 'Completa' },
  programada: { tone: 'neutral', label: () => 'Programada' },
}

/** Lista de las clases de hoy. El estado de cada una se calcula con el reloj del navegador. */
export function TodayClasses({
  classes,
  holidayLabel,
}: {
  classes: TodayClass[]
  holidayLabel: string | null
}) {
  const now = useNowMinutes()

  if (holidayLabel !== null) {
    return <p className="py-6 text-center text-sm text-muted">Hoy es feriado{holidayLabel ? `: ${holidayLabel}` : ''}. No hay clases.</p>
  }
  if (classes.length === 0) {
    return <p className="py-6 text-center text-sm text-muted">Hoy no hay clases.</p>
  }

  const rows = deriveClasses(classes, now)

  return (
    <ul className="divide-y divide-edge-divider">
      {rows.map((c) => {
        const chip = CHIP[c.state]
        const pct = c.capacity > 0 ? (c.enrolled / c.capacity) * 100 : 0
        const isFull = c.capacity > 0 && c.enrolled >= c.capacity
        return (
          <li
            key={c.id}
            className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] px-2 py-3 sm:flex-nowrap ${
              c.state === 'en_curso' ? 'bg-moss-soft' : ''
            } ${c.state === 'finalizada' ? 'opacity-60' : ''}`}
          >
            <span
              className={`w-12 shrink-0 text-sm font-semibold tabular-nums text-ink ${
                c.state === 'cancelada' ? 'line-through' : ''
              }`}
            >
              {c.start}
            </span>

            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm font-medium text-ink">{c.name}</span>
              <StatusChip tone={chip.tone}>{chip.label(c)}</StatusChip>
            </div>

            {c.state !== 'cancelada' && (
              <div className="flex w-full items-center gap-2 sm:w-40 sm:shrink-0">
                <ProgressBar
                  value={pct}
                  tone={isFull ? 'dark' : 'primary'}
                  label={`Ocupación de la clase de las ${c.start}`}
                  className="flex-1"
                />
                <span className="w-10 text-right text-[13px] tabular-nums text-ink/70">
                  {c.enrolled}/{c.capacity}
                </span>
              </div>
            )}

            {c.state === 'en_curso' && (
              <Link
                href="/instructor/pasar-lista"
                className="inline-flex h-[34px] shrink-0 items-center rounded-[10px] bg-moss px-3 text-[13px] font-semibold text-white transition hover:bg-moss-dark"
              >
                Pasar lista
              </Link>
            )}
            {c.state !== 'en_curso' && c.state !== 'cancelada' && (
              <Link
                href={`/admin/horarios/${c.id}`}
                className="inline-flex h-[34px] shrink-0 items-center rounded-[10px] border border-edge-strong bg-white px-3 text-[13px] font-medium text-ink transition hover:border-moss hover:text-moss"
              >
                Ver alumnos
              </Link>
            )}
          </li>
        )
      })}
    </ul>
  )
}
