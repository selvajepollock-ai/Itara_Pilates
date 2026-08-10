'use server'

import { createClient } from '@/lib/supabase/server'
import { daysUntilNextBirthday } from '@/lib/birthdays'

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
    (p) => p.birth_date && daysUntilNextBirthday(p.birth_date) === 0
  ).length

  return { pendingCount, birthdaysToday, pendingSignups: pendingSignups ?? 0 }
}
