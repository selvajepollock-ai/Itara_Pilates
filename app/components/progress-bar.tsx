export type BarTone = 'primary' | 'dark' | 'danger'

const FILL: Record<BarTone, string> = {
  primary: 'bg-moss',
  dark: 'bg-moss-dark',
  danger: 'bg-danger',
}

/** Barra de progreso con pista de fondo visible sobre blanco. */
export function ProgressBar({
  value,
  tone = 'primary',
  label,
  className = '',
}: {
  value: number
  tone?: BarTone
  label?: string
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
      className={`h-2 overflow-hidden rounded-full bg-edge-divider ${className}`}
    >
      <div className={`h-full rounded-full ${FILL[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  )
}
