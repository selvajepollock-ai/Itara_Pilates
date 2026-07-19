'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatTime } from '@/lib/day-names'
import { BookRecoveryButton } from './book-recovery-button'

type Option = {
  id: string
  start_time: string
  room: string
  capacity: number
  occupied: number
  hasRoom: boolean
  profiles: { full_name: string } | null
  sessionDate: string
}

export function DayAccordion({
  date,
  options,
  studentId,
  creditId,
  redirectTo,
  defaultOpen = false,
}: {
  date: string
  options: Option[]
  studentId: string
  creditId: string
  redirectTo?: string
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const label = new Date(`${date}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="overflow-hidden rounded-2xl border border-sand bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-medium capitalize text-ink">{label}</span>
        <span className="flex items-center gap-2">
          {options.length === 0 ? (
            <span className="text-xs text-ink/40">Sin horarios libres</span>
          ) : (
            <span className="text-xs text-ink/40">
              {options.filter((o) => o.hasRoom).length} con lugar
            </span>
          )}
          <ChevronDown size={16} className={`text-ink/40 transition ${open ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {open && (
        <div className="space-y-2 border-t border-sand px-5 py-4">
          {options.length === 0 ? (
            <p className="text-sm text-ink/40">No hay clases de este tipo ese día.</p>
          ) : (
            options.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between rounded-xl border bg-linen/30 px-4 py-3 ${
                  c.hasRoom ? 'border-sand' : 'border-sand opacity-50'
                }`}
              >
                <div>
                  <p className="font-display italic text-ink">{formatTime(c.start_time)}</p>
                  <p className="text-xs text-ink/50">
                    {c.room} · {c.profiles?.full_name ?? 'Sin instructor'} · {c.occupied}/{c.capacity}
                  </p>
                </div>
                {c.hasRoom ? (
                  <BookRecoveryButton
                    studentId={studentId}
                    creditId={creditId}
                    classId={c.id}
                    sessionDate={c.sessionDate}
                    redirectTo={redirectTo}
                  />
                ) : (
                  <p className="text-xs text-clay">Completo</p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
