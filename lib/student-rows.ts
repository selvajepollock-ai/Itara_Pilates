import type { SupabaseClient } from '@supabase/supabase-js'
import { applyLateSurcharge, isFirstMonth, subscriptionDisplayStatus, subscriptionStatus, surchargeWaiver } from '@/lib/billing'
import { isNoAccessEmail } from '@/lib/auth-username'
import { todayART } from '@/lib/dates'
import type { StudentRow } from '@/app/admin/alumnos/types'

const PAYMENTS_PAGE = 1000

/**
 * Filas de alumnos con estado de cuota, profesor y último pago (solo lectura).
 * La usan Alumnos y Horarios, así la ficha lateral muestra lo mismo en las dos pantallas.
 */
export async function loadStudentRows(supabase: SupabaseClient): Promise<{ rows: StudentRow[]; dueDay: number }> {
  const [{ data: students }, { data: subscriptions }, { data: settings }, { data: enrollments }, { data: dropIns }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, nickname, email, contact_email, phone, active, created_at')
      .contains('roles', ['student'])
      .order('created_at', { ascending: false }),
    supabase
      .from('subscriptions')
      .select('*, plans(name, price)')
      .eq('status', 'active'),
    supabase.from('studio_settings').select('payment_reminder_days_before, payment_due_day').single(),
    supabase
      .from('enrollments')
      .select('student_id, classes(instructor_id, profiles(full_name))')
      .eq('status', 'active'),
    // Clases sueltas compradas (solo lectura): sirven para distinguir "sin plan" de "con clases sueltas".
    supabase.from('extra_charges').select('student_id, paid, comp, recovery_credits(used_session_date)'),
  ])

  // Último pago de cada alumno. PostgREST devuelve de a 1000 filas: se pide por tandas.
  const lastPaymentByStudent = new Map<string, string>()
  for (let from = 0; from < PAYMENTS_PAGE * 10; from += PAYMENTS_PAGE) {
    const { data: rows } = await supabase
      .from('payments')
      .select('paid_at, subscriptions(student_id)')
      .is('voided_at', null)
      .order('paid_at', { ascending: false })
      .range(from, from + PAYMENTS_PAGE - 1)
    for (const r of rows ?? []) {
      const studentId = (r.subscriptions as unknown as { student_id: string } | null)?.student_id
      if (studentId && !lastPaymentByStudent.has(studentId)) lastPaymentByStudent.set(studentId, r.paid_at as string)
    }
    if (!rows || rows.length < PAYMENTS_PAGE) break
  }

  const today = todayART()
  const dropInByStudent = new Map<string, { count: number; unpaid: number }>()
  for (const c of dropIns ?? []) {
    if (c.comp) continue
    const date = (c.recovery_credits as unknown as { used_session_date: string | null } | null)?.used_session_date ?? null
    // Vigente: todavía sin cobrar o con la clase en el futuro.
    if (c.paid && !(date && date >= today)) continue
    const cur = dropInByStudent.get(c.student_id as string) ?? { count: 0, unpaid: 0 }
    cur.count++
    if (!c.paid) cur.unpaid++
    dropInByStudent.set(c.student_id as string, cur)
  }

  const subByStudent = new Map((subscriptions ?? []).map((s) => [s.student_id, s]))
  const reminderDays = settings?.payment_reminder_days_before ?? 3
  const dueDay = settings?.payment_due_day ?? 10

  // Un alumno tiene un solo profesor (regla de negocio): tomamos el primero que
  // aparezca entre sus clases activas.
  const instructorByStudent = new Map<string, { id: string; name: string }>()
  for (const e of enrollments ?? []) {
    if (instructorByStudent.has(e.student_id)) continue
    const cls = e.classes as unknown as { instructor_id: string | null; profiles: { full_name: string } | null } | null
    if (cls?.instructor_id) {
      instructorByStudent.set(e.student_id, { id: cls.instructor_id, name: cls.profiles?.full_name ?? 'Profesor' })
    }
  }

  const rows: StudentRow[] = (students ?? []).map((s) => {
    const sub = subByStudent.get(s.id) ?? null
    const plan = sub?.plans as unknown as { name: string; price: number } | null
    const baseStatus = subscriptionDisplayStatus(sub, reminderDays)
    const dropIn = dropInByStudent.get(s.id) ?? { count: 0, unpaid: 0 }
    // Sin plan mensual pero con clases sueltas compradas: no es lo mismo que "sin plan" a secas.
    const status = baseStatus === 'sin_plan' && dropIn.count > 0 ? ('sueltas' as const) : baseStatus
    // El recargo sale del estado "real" (con margen de gracia): el mismo cálculo de la ficha de cuota.
    const billing = subscriptionStatus(sub, reminderDays, dueDay)
    const waiver = surchargeWaiver(sub as Parameters<typeof surchargeWaiver>[0])
    const surcharge = applyLateSurcharge(plan?.price ?? 0, billing)
    const lastPayment = lastPaymentByStudent.get(s.id) ?? null
    return {
      id: s.id,
      fullName: s.full_name,
      nickname: s.nickname,
      email: s.email,
      displayEmail: isNoAccessEmail(s.email) ? s.contact_email ?? null : s.email,
      hasAccess: !isNoAccessEmail(s.email),
      phone: s.phone,
      active: s.active,
      status,
      hasSurcharge: status === 'vencido' && surcharge.hasSurcharge && !waiver,
      surchargeAmount: surcharge.hasSurcharge && !waiver ? surcharge.amount : null,
      surchargeWaived: Boolean(waiver),
      // Alumno nuevo que todavía no hizo su primer pago: no es un atraso, es el primer cobro pendiente.
      firstPayment: status === 'vencido' && isFirstMonth(sub as Parameters<typeof isFirstMonth>[0]) && !lastPayment,
      planId: sub?.plan_id ?? null,
      planName: plan?.name ?? null,
      planPrice: plan?.price ?? 0,
      subscriptionId: sub?.id ?? null,
      endDate: sub?.end_date ?? null,
      comp: Boolean(sub?.comp),
      instructorId: instructorByStudent.get(s.id)?.id ?? null,
      instructorName: instructorByStudent.get(s.id)?.name ?? null,
      lastPaymentAt: lastPaymentByStudent.get(s.id) ?? null,
      dropInCount: dropIn.count,
      dropInUnpaid: dropIn.unpaid,
    }
  })

  return { rows, dueDay }
}
