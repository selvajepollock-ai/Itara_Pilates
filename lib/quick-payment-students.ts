import type { SupabaseClient } from '@supabase/supabase-js'
import { suggestNextPaymentDate } from '@/lib/billing'

type PlanRef = { name: string; price: number } | null

/** Alumnos con su suscripción, en el formato que espera el flujo "Registrar un pago" (QuickPayment). */
export async function loadQuickPaymentStudents(supabase: SupabaseClient) {
  const [{ data: students }, { data: subs }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('id, full_name').contains('roles', ['student']),
    supabase.from('subscriptions').select('id, student_id, end_date, plans(name, price)').eq('status', 'active'),
    supabase.from('studio_settings').select('payment_due_day').single(),
  ])
  const dueDay = settings?.payment_due_day ?? 10
  const subByStudent = new Map((subs ?? []).map((s) => [s.student_id, s]))
  return (students ?? []).map((s) => {
    const sub = subByStudent.get(s.id)
    const planInfo = sub?.plans as unknown as PlanRef
    return {
      id: s.id as string,
      full_name: s.full_name as string,
      subscriptionId: (sub?.id as string | undefined) ?? null,
      planName: planInfo?.name ?? null,
      planPrice: planInfo?.price ?? 0,
      endDate: (sub?.end_date as string | null | undefined) ?? null,
      suggestedNextDate: suggestNextPaymentDate((sub?.end_date as string | null | undefined) ?? null),
    }
  })
}
