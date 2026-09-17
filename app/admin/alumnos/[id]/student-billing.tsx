import { createClient } from '@/lib/supabase/server'
import {
  subscriptionStatus,
  STATUS_LABEL,
  STATUS_CLASSES,
  suggestNextPaymentDate,
  applyLateSurcharge,
} from '@/lib/billing'
import { formatARS } from '@/lib/currency'
import Link from 'next/link'
import { AssignPlanForm } from './assign-plan-form'
import { RegisterPaymentForm } from './register-payment-form'
import { PlanSectionToggle } from './plan-section-toggle'
import { PaymentRowActions } from '../../pagos/cuotas/payment-row-actions'

export async function StudentBilling({ studentId, studentName }: { studentId: string; studentName: string }) {
  const supabase = await createClient()

  const [{ data: plans }, { data: subscription }, { data: settings }] = await Promise.all([
    supabase.from('plans').select('id, name, price').eq('active', true).order('price'),
    supabase
      .from('subscriptions')
      .select('id, plan_id, end_date, comp, comp_reason, plans(name, price)')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('studio_settings').select('payment_due_day, payment_reminder_days_before').single(),
  ])

  const { data: payments } = subscription
    ? await supabase
        .from('payments')
        .select('id, amount, paid_at, notes, voided_at, voided_reason')
        .eq('subscription_id', subscription.id)
        .order('paid_at', { ascending: false })
        .limit(5)
    : { data: [] }

  const dueDay = settings?.payment_due_day ?? 10
  const reminderDays = settings?.payment_reminder_days_before ?? 3
  const isComp = Boolean(subscription?.comp)
  const status = subscriptionStatus(subscription ?? null, reminderDays, dueDay)
  const suggestedNextDate = suggestNextPaymentDate(subscription?.end_date ?? null)

  const planInfo = subscription?.plans as unknown as { name: string; price: number } | null
  const { amount: amountWithSurcharge, hasSurcharge } = applyLateSurcharge(planInfo?.price ?? 0, status)

  // Fecha de vencimiento real (con margen de gracia): día `dueDay` del mes siguiente
  // al que ya está cubierto.
  const graceDeadlineLabel = subscription?.end_date
    ? (() => {
        const end = new Date(`${subscription.end_date}T00:00:00`)
        const deadline = new Date(end.getFullYear(), end.getMonth() + 1, dueDay)
        return deadline.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
      })()
    : null

  return (
    <div className="rounded-2xl border border-sand bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Cuota</p>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {subscription ? (
        <div className="mt-3 space-y-1">
          <p className="font-display text-lg italic text-ink">{planInfo?.name}</p>
          {isComp ? (
            <p className="text-sm text-ink/60">
              Sin cargo — no se le cobra ni cuenta como deuda.
              {subscription.comp_reason ? (
                <span className="text-ink/45"> ({subscription.comp_reason})</span>
              ) : null}
            </p>
          ) : (
            <>
              <p className="text-sm text-ink/60">
                Pagado hasta el{' '}
                <span className="font-medium text-ink">
                  {new Date(`${subscription.end_date}T00:00:00`).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              </p>
              {graceDeadlineLabel && (
                <p className="text-sm text-ink/60">
                  Próximo pago vence el{' '}
                  <span className="font-medium text-ink">{graceDeadlineLabel}</span>
                </p>
              )}
              {hasSurcharge && (
                <p className="mt-1 text-xs font-medium text-clay">
                  Pasó el margen de pago — con recargo del 10% debe {formatARS(amountWithSurcharge)}.
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink/50">Todavía no tiene un plan asignado.</p>
      )}

      {subscription ? (
        <div className="mt-4">
          <PlanSectionToggle>
            <AssignPlanForm
              studentId={studentId}
              plans={plans ?? []}
              currentPlanId={subscription?.plan_id ?? null}
              defaultEndDate={
                subscription?.end_date && subscription.end_date < '2999-01-01'
                  ? subscription.end_date
                  : suggestedNextDate
              }
              currentComp={isComp}
              currentCompReason={subscription.comp_reason ?? ''}
            />
          </PlanSectionToggle>
        </div>
      ) : (
        <div className="mt-4">
          <AssignPlanForm
            studentId={studentId}
            plans={plans ?? []}
            currentPlanId={null}
            defaultEndDate={suggestedNextDate}
          />
        </div>
      )}

      {subscription && !isComp && (
        <div className="mt-5 border-t border-sand pt-5">
          <p className="section-title">Registrar pago</p>
          <p className="mt-0.5 text-xs text-ink/40">
            Extiende la cobertura hasta{' '}
            {new Date(`${suggestedNextDate}T00:00:00`).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
            })}
            .
          </p>
          <RegisterPaymentForm
            subscriptionId={subscription.id}
            studentId={studentId}
            defaultAmount={amountWithSurcharge}
            suggestedNextDate={suggestedNextDate}
          />
        </div>
      )}

      {subscription && (
        <div className="mt-5 border-t border-sand pt-4">
          <div className="flex items-center justify-between">
            <p className="section-title">Últimos pagos</p>
            <Link
              href={`/admin/pagos/cuotas?q=${encodeURIComponent(studentName)}&anuladas=1`}
              className="text-xs font-medium text-moss hover:text-moss-dark"
            >
              Ver todos →
            </Link>
          </div>
          <div className="mt-2 overflow-hidden rounded-xl border border-sand">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand bg-linen/40 text-left text-[11px] uppercase tracking-wide text-ink/40">
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium text-right">Monto</th>
                  <th className="px-3 py-2 font-medium">Nota</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {(!payments || payments.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-xs text-ink/40">
                      Todavía no se registró ningún pago.
                    </td>
                  </tr>
                )}
                {(payments ?? []).map((p) => {
                  const voided = Boolean(p.voided_at)
                  return (
                    <tr key={p.id} className={`border-b border-sand/50 last:border-0 ${voided ? 'text-ink/35' : 'text-ink/70'}`}>
                      <td className="whitespace-nowrap px-3 py-2">
                        {new Date(p.paid_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className={`whitespace-nowrap px-3 py-2 text-right ${voided ? 'line-through' : 'font-medium text-ink'}`}>
                        {formatARS(p.amount)}
                      </td>
                      <td className="max-w-[140px] truncate px-3 py-2 text-xs">
                        {voided ? (
                          <span className="italic text-clay">Anulado — {p.voided_reason}</span>
                        ) : (
                          p.notes || '—'
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {!voided && <PaymentRowActions paymentId={p.id} amount={Number(p.amount)} notes={p.notes ?? ''} />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[11px] text-ink/40">
            "Anular" no borra el pago, lo marca como inválido con un motivo — es la forma de revertir un pago
            cargado por error.
          </p>
        </div>
      )}
    </div>
  )
}
