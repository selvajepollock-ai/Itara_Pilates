'use server'

import { createClient } from '@/lib/supabase/server'

export type DrawerPayment = {
  id: string
  kind: 'cuota' | 'suelta'
  amount: number
  paidAt: string
  note: string
  concept: string
  voided: boolean
  voidedReason: string
  recordedBy: string | null
}

export type DrawerClass = { id: string; dow: number; start: string; typeName: string; instructor: string | null; room: string }
export type DrawerEvent = { date: string; text: string; tone: 'yellow' | 'green' | 'red' }

export type DrawerData = {
  payments: DrawerPayment[]
  classes: DrawerClass[]
  upcomingRecoveries: { date: string; start: string; typeName: string }[]
  events: DrawerEvent[]
  healthNotes: string | null
}

/**
 * Datos de las pestañas Pagos, Clases y Notas de la ficha lateral (solo lectura, solo admin).
 * Son las mismas tablas que ya muestra la ficha completa del alumno.
 */
export async function getStudentDrawerData(studentId: string): Promise<{ error?: string; data?: DrawerData }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado.' }
  const { data: me } = await supabase.from('profiles').select('roles').eq('id', user.id).maybeSingle()
  if (!me?.roles?.includes('admin')) return { error: 'Sin permisos.' }

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: subs }, { data: extras }, { data: enrollments }, { data: recoveries }, { data: cancels }, { data: profile }, { data: team }] =
    await Promise.all([
      supabase.from('subscriptions').select('id, plans(name)').eq('student_id', studentId),
      supabase
        .from('extra_charges')
        .select('id, description, amount, paid_at')
        .eq('student_id', studentId)
        .eq('paid', true)
        .eq('comp', false)
        .order('paid_at', { ascending: false })
        .limit(20),
      supabase
        .from('enrollments')
        .select('id, classes(id, room, day_of_week, start_time, class_types(name), profiles(full_name))')
        .eq('student_id', studentId)
        .eq('status', 'active'),
      supabase
        .from('attendance')
        .select('session_date, classes(start_time, class_types(name))')
        .eq('student_id', studentId)
        .not('recovery_credit_id', 'is', null)
        .gte('session_date', today)
        .order('session_date'),
      supabase
        .from('session_cancellations')
        .select('session_date, within_deadline')
        .eq('student_id', studentId)
        .order('session_date', { ascending: false })
        .limit(8),
      supabase.from('profiles').select('health_notes').eq('id', studentId).maybeSingle(),
      supabase.from('profiles').select('id, full_name'),
    ])

  const subIds = (subs ?? []).map((s) => s.id as string)
  const planBySub = new Map((subs ?? []).map((s) => [s.id as string, (s.plans as unknown as { name: string } | null)?.name ?? 'Cuota']))
  const nameById = new Map((team ?? []).map((p) => [p.id as string, p.full_name as string]))

  const { data: payments } = subIds.length
    ? await supabase
        .from('payments')
        .select('id, subscription_id, amount, paid_at, notes, voided_at, voided_reason, recorded_by')
        .in('subscription_id', subIds)
        .order('paid_at', { ascending: false })
        .limit(30)
    : { data: [] }

  const list: DrawerPayment[] = [
    ...(payments ?? []).map((p): DrawerPayment => ({
      id: p.id as string,
      kind: 'cuota',
      amount: Number(p.amount),
      paidAt: p.paid_at as string,
      note: (p.notes as string | null) ?? '',
      concept: planBySub.get(p.subscription_id as string) ?? 'Cuota',
      voided: Boolean(p.voided_at),
      voidedReason: (p.voided_reason as string | null) ?? '',
      recordedBy: p.recorded_by ? nameById.get(p.recorded_by as string) ?? null : null,
    })),
    ...(extras ?? []).map((c): DrawerPayment => ({
      id: c.id as string,
      kind: 'suelta',
      amount: Number(c.amount),
      paidAt: c.paid_at as string,
      note: '',
      concept: (c.description as string | null) ?? 'Clase suelta',
      voided: false,
      voidedReason: '',
      recordedBy: null,
    })),
  ].sort((a, b) => b.paidAt.localeCompare(a.paidAt))

  type ClassRef = {
    id: string
    room: string
    day_of_week: number
    start_time: string
    class_types: { name: string } | null
    profiles: { full_name: string } | null
  }
  const classes: DrawerClass[] = ((enrollments ?? []) as unknown as { classes: ClassRef | null }[])
    .map((e) => e.classes)
    .filter((c): c is ClassRef => !!c)
    .map((c) => ({
      id: c.id,
      dow: c.day_of_week,
      start: c.start_time.slice(0, 5),
      typeName: c.class_types?.name ?? 'Clase',
      instructor: c.profiles?.full_name ?? null,
      room: c.room,
    }))
    .sort((a, b) => (a.dow === 0 ? 7 : a.dow) - (b.dow === 0 ? 7 : b.dow) || a.start.localeCompare(b.start))

  const upcomingRecoveries = ((recoveries ?? []) as unknown as {
    session_date: string
    classes: { start_time: string; class_types: { name: string } | null } | null
  }[]).map((r) => ({
    date: r.session_date,
    start: (r.classes?.start_time ?? '').slice(0, 5),
    typeName: r.classes?.class_types?.name ?? 'Clase',
  }))

  const events: DrawerEvent[] = (cancels ?? []).map((c) => ({
    date: c.session_date as string,
    text: c.within_deadline ? 'Avisó que no iba (a tiempo)' : 'Avisó tarde que no iba',
    tone: c.within_deadline ? 'yellow' : 'red',
  }))

  return { data: { payments: list, classes, upcomingRecoveries, events, healthNotes: (profile?.health_notes as string | null) ?? null } }
}
