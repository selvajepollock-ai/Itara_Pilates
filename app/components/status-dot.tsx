import type { PaymentStatus } from '@/lib/billing'

type View = { dot: string; ink: string; label: string }

export const STATUS_VIEW: Record<PaymentStatus, View> = {
  al_dia: { dot: 'bg-state-ok', ink: 'text-state-ok-ink', label: 'Al día' },
  por_vencer: { dot: 'bg-state-soon', ink: 'text-state-soon-ink', label: 'Por vencer' },
  vencido: { dot: 'bg-state-due', ink: 'text-state-due-ink', label: 'Vencido' },
  sin_plan: { dot: 'bg-state-none', ink: 'text-state-none-ink', label: 'Sin plan' },
  bonificado: { dot: 'bg-state-free', ink: 'text-state-free-ink', label: 'Bonificado' },
  sueltas: { dot: 'bg-state-soon', ink: 'text-state-soon-ink', label: 'Clases sueltas' },
}

// Vencido que además ya tiene recargo (pasó el margen de gracia).
export const SURCHARGE_VIEW: View = {
  dot: 'bg-state-surcharge',
  ink: 'text-state-surcharge-ink',
  label: 'Vencido · recargo',
}

export function statusView(status: PaymentStatus, surcharge = false): View {
  return status === 'vencido' && surcharge ? SURCHARGE_VIEW : STATUS_VIEW[status]
}

/** Estado como punto de color + texto, sin pastilla rellena. El texto siempre está. */
export function StatusDot({
  status,
  surcharge = false,
  className = '',
  label,
}: {
  status: PaymentStatus
  surcharge?: boolean
  className?: string
  /** Texto distinto al habitual (ej: "Pendiente de primer pago"). */
  label?: string
}) {
  const v = statusView(status, surcharge)
  return (
    <span className={`inline-flex items-center gap-2 text-[13px] font-medium ${v.ink} ${className}`}>
      <span aria-hidden className={`h-2 w-2 shrink-0 rounded-full ${v.dot}`} />
      {label ?? v.label}
    </span>
  )
}
