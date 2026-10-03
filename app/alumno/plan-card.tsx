import { STATUS_CLASSES, STATUS_LABEL, type PaymentStatus } from '@/lib/billing'
import { RequestPlanChangeForm } from './request-plan-change-form'

type Plan = { id: string; name: string; price: number }

/** Tu cuota: plan y pedido de cambio a la izquierda; estado y "Hasta" a la derecha. */
export function PlanCard({
  planName,
  endDateText,
  status,
  plans,
}: {
  planName: string | null
  endDateText: string | null
  status: PaymentStatus
  plans: Plan[]
}) {
  return (
    <section className="rounded-2xl border border-edge bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">Tu plan</p>
          <p className="mt-0.5 font-display text-xl italic text-ink">{planName ?? 'Sin plan asignado'}</p>
          <div className="mt-2">
            <RequestPlanChangeForm plans={plans} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}>
            {STATUS_LABEL[status]}
          </span>
          {endDateText && <p className="mt-1.5 text-xs text-muted">Hasta el {endDateText}</p>}
        </div>
      </div>
    </section>
  )
}
