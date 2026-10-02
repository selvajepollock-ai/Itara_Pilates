import { MessageCircle } from 'lucide-react'
import { SectionCard } from '@/app/components/section-card'

export type BirthdayRow = {
  name: string
  /** Ej: "Domingo 4" */
  dateLabel: string
  daysUntil: number
  phone: string | null
}

function relative(daysUntil: number) {
  if (daysUntil === 0) return 'hoy'
  if (daysUntil === 1) return 'mañana'
  return `en ${daysUntil} días`
}

/** Próximos cumpleaños. "Saludar" abre WhatsApp solo si el alumno tiene teléfono cargado. */
export function BirthdaysCard({ rows }: { rows: BirthdayRow[] }) {
  return (
    <SectionCard title="Cumpleaños">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">Nada en los próximos 30 días.</p>
      ) : (
        <ul className="divide-y divide-edge-divider">
          {rows.map((b) => {
            const digits = b.phone?.replace(/\D/g, '') ?? ''
            return (
              <li key={b.name} className="flex items-center gap-3 py-3">
                <span
                  aria-hidden
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-blush text-[13px] font-semibold text-danger-ink"
                >
                  {b.name.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{b.name}</p>
                  <p className="text-[13px] text-muted">
                    {b.dateLabel} · {relative(b.daysUntil)}
                  </p>
                </div>
                {digits && (
                  <a
                    href={`https://wa.me/${digits}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Saludar a ${b.name} por WhatsApp`}
                    className="inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-[10px] border border-edge-strong bg-white px-3 text-[13px] font-medium text-ink transition hover:border-moss hover:text-moss"
                  >
                    <MessageCircle size={14} />
                    Saludar
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </SectionCard>
  )
}
