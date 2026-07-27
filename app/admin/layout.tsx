import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  return (
    <div className="flex min-h-screen flex-col bg-linen lg:flex-row">
      <TopNav fullName={profile.full_name} />
      <div className="hidden lg:block">
        <Sidebar fullName={profile.full_name} />
      </div>
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8 lg:px-14 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  )
}
