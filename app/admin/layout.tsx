import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { daysUntilNextBirthday } from '@/lib/birthdays'
import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.roles?.includes('admin')) {
    redirect('/')
  }

  const [{ count: pendingRecoveries }, { count: pendingPlanRequests }, { data: birthdayProfiles }] =
    await Promise.all([
      supabase
        .from('recovery_credits')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('plan_change_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('profiles')
        .select('birth_date')
        .contains('roles', ['student'])
        .not('birth_date', 'is', null),
    ])

  const pendingCount = (pendingRecoveries ?? 0) + (pendingPlanRequests ?? 0)
  const birthdaysToday = (birthdayProfiles ?? []).filter(
    (p) => p.birth_date && daysUntilNextBirthday(p.birth_date) === 0
  ).length

  return (
    <div className="flex min-h-screen flex-col bg-linen lg:flex-row">
      <TopNav fullName={profile.full_name} pendingCount={pendingCount} birthdaysToday={birthdaysToday} />
      <div className="hidden lg:block">
        <Sidebar fullName={profile.full_name} pendingCount={pendingCount} birthdaysToday={birthdaysToday} />
      </div>
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-14 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
