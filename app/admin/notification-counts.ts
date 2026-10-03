'use server'

import { createClient } from '@/lib/supabase/server'
import { daysUntilNextBirthday } from '@/lib/birthdays'
import { formatTime } from '@/lib/day-names'
import { dayDate } from '../alumno/format'
import type { InboxItem } from './notification-types'

export async function getNotificationCounts() {
  const supabase = await createClient()

  const [
    { count: pendingRecoveries },
    { count: pendingPlanRequests },
    { count: newCancellations },
    { count: pendingSignups },
    { data: birthdayProfiles },
  ] = await Promise.all([
    supabase
      .from('recovery_credits')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'requested'),
    supabase
      .from('plan_change_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('session_cancellations')
      .select('id', { count: 'exact', head: true })
      .eq('acknowledged', false),
    supabase
      .from('signup_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('profiles')
      .select('birth_date')
      .contains('roles', ['student'])
      .not('birth_date', 'is', null),
  ])

  const pendingCount = (pendingRecoveries ?? 0) + (pendingPlanRequests ?? 0) + (newCancellations ?? 0)
  const birthdaysToday = (birthdayProfiles ?? []).filter(
    (p) => p.birth_date && daysUntilNextBirthday(p.birth_date) <= 5
  ).length

  return { pendingCount, birthdaysToday, pendingSignups: pendingSignups ?? 0 }
}

/**
 * Detalle de "cosas que un alumno pidió y esperan tu respuesta", para la campanita
 * del header. Junta registros nuevos + recuperaciones + cambios de plan +
 * cancelaciones sin ver, ordenadas de más nueva a más vieja.
 */
export async function getNotificationInbox(): Promise<{ items: InboxItem[] }> {
  const supabase = await createClient()

  const [
    { data: signups },
    { data: recoveries },
    { data: planRequests },
    { data: cancellations },
    { data: birthdayProfiles },
  ] = await Promise.all([
    supabase
      .from('signup_requests')
      .select('id, first_name, last_name, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('recovery_credits')
      .select('id, created_at, requested_session_date, requested:requested_class_id(start_time), profiles(full_name)')
      .eq('status', 'requested')
      .order('created_at', { ascending: false }),
    supabase
      .from('plan_change_requests')
      .select('id, created_at, profiles(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase
      .from('session_cancellations')
      .select('id, cancelled_at, within_deadline, profiles(full_name)')
      .eq('acknowledged', false)
      .order('cancelled_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('id, full_name, birth_date')
      .contains('roles', ['student'])
      .not('birth_date', 'is', null),
  ])

  const name = (r: { profiles: unknown }) =>
    (r.profiles as { full_name: string } | null)?.full_name ?? 'Alumno'

  const make = (i: Omit<InboxItem, 'text'>): InboxItem => ({ ...i, text: `${i.name} ${i.rest}`.trim() })

  const items: InboxItem[] = [
    ...(signups ?? []).map((s): InboxItem =>
      make({
        key: `signup-${s.id}`,
        kind: 'signup',
        name: `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim() || 'Alguien',
        rest: 'pidió registrarse',
        href: `/admin/alumnos/vincular/${s.id}`,
        at: s.created_at as string | null,
      })
    ),
    ...(recoveries ?? []).map((r): InboxItem => {
      const requested = (r as unknown as { requested: { start_time: string } | null }).requested
      const date = (r as unknown as { requested_session_date: string | null }).requested_session_date
      return make({
        key: `recovery-${r.id}`,
        kind: 'recovery',
        name: name(r),
        rest:
          requested && date
            ? `pidió recuperar el ${dayDate(date)} a las ${formatTime(requested.start_time)}`
            : 'pidió recuperar una clase',
        href: '/admin/avisos',
        at: r.created_at as string | null,
        creditId: r.id as string,
      })
    }),
    ...(planRequests ?? []).map((r): InboxItem =>
      make({
        key: `plan-${r.id}`,
        kind: 'plan',
        name: name(r),
        rest: 'pidió cambiar de plan',
        href: '/admin/avisos',
        at: r.created_at as string | null,
      })
    ),
    ...(cancellations ?? []).map((r): InboxItem => {
      const late = (r as unknown as { within_deadline: boolean | null }).within_deadline === false
      return make({
        key: `cancel-${r.id}`,
        kind: 'cancellation',
        name: name(r),
        rest: late ? 'avisó tarde que no viene' : 'avisó que no viene',
        href: '/admin/avisos',
        at: r.cancelled_at as string | null,
        late,
      })
    }),
    ...(birthdayProfiles ?? [])
      .filter((p) => p.birth_date && daysUntilNextBirthday(p.birth_date) <= 5)
      .map((p): InboxItem => {
        const daysUntil = daysUntilNextBirthday(p.birth_date as string)
        const when = daysUntil === 0 ? 'hoy' : daysUntil === 1 ? 'mañana' : `en ${daysUntil} días`
        return make({
          key: `birthday-${p.id}`,
          kind: 'birthday',
          name: p.full_name as string,
          rest: `cumple años ${when}`,
          href: `/admin/alumnos/${p.id}`,
          at: null,
        })
      }),
  ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))

  return { items }
}
