import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { countOverdueSubscriptions } from '@/lib/overdue'
import { Sidebar } from './sidebar'
import { MobileHeader } from './mobile-header'
import { BottomNav } from './bottom-nav'
import { getNotificationInbox } from './notification-counts'

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

  const isDeveloper = profile?.roles?.includes('developer') ?? false

  const [{ count: pendingSignups }, { data: subscriptions }] = await Promise.all([
    supabase
      .from('signup_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Para el badge de Pagos (cuotas vencidas): mismo cálculo que el Inicio.
    supabase.from('subscriptions').select('student_id, end_date, comp').eq('status', 'active'),
  ])

  const overdueCount = countOverdueSubscriptions(subscriptions ?? [])
  const { items: notifications } = await getNotificationInbox()

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden lg:block">
        <Sidebar
          fullName={profile.full_name}
          pendingSignups={pendingSignups ?? 0}
          overdueCount={overdueCount}
          isDeveloper={isDeveloper}
          notifications={notifications}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader notifications={notifications} />
        <main className="flex-1 px-4 py-6 pb-[calc(88px+env(safe-area-inset-bottom))] sm:px-8 sm:py-8 lg:px-12 lg:py-10 lg:pb-10">
          <div className="mx-auto max-w-6xl">{children}</div>
        </main>
      </div>

      <BottomNav pendingSignups={pendingSignups ?? 0} overdueCount={overdueCount} isDeveloper={isDeveloper} />
    </div>
  )
}
