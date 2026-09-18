'use server'

import { createClient } from '@/lib/supabase/server'
import { daysUntilNextBirthday } from '@/lib/birthdays'
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
        .select('id, created_at, profiles(full_name)')
        .eq('status', 'requested')
        .order('created_at', { ascending: false }),
      supabase
        .from('plan_change_requests')
        .select('id, created_at, profiles(full_name)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabase
        .from('session_cancellations')
        .select('id, cancelled_at, profiles(full_name)')
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

  const items: InboxItem[] = [
    ...(signups ?? []).map((s): InboxItem => ({
      key: `signup-${s.id}`,
      kind: 'signup',
      text: `Nuevo registro: ${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
      href: `/admin/alumnos/vincular/${s.id}`,
      at: s.created_at as string | null,
    })),
    ...(recoveries ?? []).map((r): InboxItem => ({
      key: `recovery-${r.id}`,
      kind: 'recovery',
      text: `${name(r)} pide recuperar una clase`,
      href: '/admin/avisos',
      at: r.created_at as string | null,
    })),
    ...(planRequests ?? []).map((r): InboxItem => ({
      key: `plan-${r.id}`,
      kind: 'plan',
      text: `${name(r)} quiere cambiar de plan`,
      href: '/admin/avisos',
      at: r.created_at as string | null,
    })),
    ...(cancellations ?? []).map((r): InboxItem => ({
      key: `cancel-${r.id}`,
      kind: 'cancellation',
      text: `${name(r)} avisó que no viene`,
      href: '/admin/avisos',
      at: r.cancelled_at as string | null,
    })),
    ...(birthdayProfiles ?? [])
      .filter((p) => p.birth_date && daysUntilNextBirthday(p.birth_date) <= 5)
      .map((p): InboxItem => {
        const daysUntil = daysUntilNextBirthday(p.birth_date as string)
        const when = daysUntil === 0 ? 'Hoy' : daysUntil === 1 ? 'Mañana' : `En ${daysUntil} días`
        return {
          key: `birthday-${p.id}`,
          kind: 'birthday',
          text: `${when}: cumpleaños de ${p.full_name}`,
          href: `/admin/alumnos/${p.id}`,
          at: null,
        }
      }),
  ].sort((a, b) => (b.at ?? '').localeCompare(a.at ?? ''))

  return { items }
}
