export type ChipTone = 'neutral' | 'success' | 'info' | 'danger' | 'warning' | 'terracotta'

const TONES: Record<ChipTone, string> = {
  neutral: 'bg-edge-divider text-muted',
  success: 'bg-moss-soft text-moss-dark',
  info: 'bg-info-soft text-info-ink',
  danger: 'bg-danger-soft text-danger-ink',
  warning: 'bg-warning-soft text-warning-ink',
  terracotta: 'bg-blush text-danger-ink',
}

/** Chip de estado. Siempre lleva texto: el color nunca es el único indicador. */
export function StatusChip({ tone = 'neutral', children }: { tone?: ChipTone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
