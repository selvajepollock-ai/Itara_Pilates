import { createClient } from '@/lib/supabase/server'
import { getPaymentStatus, STATUS_LABEL, STATUS_CLASSES, suggestNextDueDate } from '@/lib/billing'
import { formatARS } from '@/lib/currency'
import { AssignPlanForm } from './assign-plan-form'
import { RegisterPaymentForm } from './register-payment-form'

export async function StudentBilling({ studentId }: { studentId: string }) {
  const supabase = await createClient()

  const [{ data: plans }, { data: subscription }, { data: settings }] = await Promise.all([
    supabase.from('plans').select('id, name, price').eq('active', true).order('price'),
    supabase
      .from('subscriptions')
      .select('id, plan_id, end_date, plans(name, price)')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .maybeSingle(),
    supabase.from('studio_settings').select('payment_due_day, payment_reminder_days_before').single(),
  ])

  const { data: payments } = subscription
    ? await supabase
        .from('payments')
        .select('id, amount, paid_at, notes')
        .eq('subscription_id', subscription.id)
        .order('paid_at', { ascending: false })
        .limit(5)
    : { data: [] }

  const dueDay = settings?.payment_due_day ?? 10
  const reminderDays = settings?.payment_reminder_days_before ?? 3
  const status = getPaymentStatus(subscription?.end_date ?? null, reminderDays)
  const suggestedNextDate = suggestNextDueDate(
    subscription?.end_date ? new Date(`${subscription.end_date}T00:00:00`) : new Date(),
    dueDay
  )

  const planInfo = subscription?.plans as unknown as { name: string; price: number } | null

  return (
    <div className="rounded-2xl border border-sand bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.25em] text-moss">Cuota</p>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {subscription ? (
        <div className="mt-3">
          <p className="font-display text-lg italic text-ink">{planInfo?.name}</p>
          <p className="mt-0.5 text-sm text-ink/50">
            Pagado hasta{' '}
            {new Date(`${subscription.end_date}T00:00:00`).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink/50">Todavía no tiene un plan asignado.</p>
      )}

      <div className="mt-4">
        <AssignPlanForm
          studentId={studentId}
          plans={plans ?? []}
          currentPlanId={subscription?.plan_id ?? null}
          defaultEndDate={subscription?.end_date ?? suggestedNextDate}
        />
      </div>

      {subscription && (
        <div className="mt-5 border-t border-sand pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">
            Marcar como pagado
          </p>
          <RegisterPaymentForm
            subscriptionId={subscription.id}
            studentId={studentId}
            defaultAmount={planInfo?.price ?? 0}
            suggestedNextDate={suggestedNextDate}
          />
        </div>
      )}

      {payments && payments.length > 0 && (
        <div className="mt-5 border-t border-sand pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-ink/40">Últimos pagos</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between text-ink/60">
                <span>
                  {new Date(p.paid_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                </span>
                <span>{formatARS(p.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
