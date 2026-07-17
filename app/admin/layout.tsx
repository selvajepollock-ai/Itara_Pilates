import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/lib/supabase/logout-button'

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
    <div className="min-h-screen bg-linen">
      <header className="border-b border-sand bg-white/70 px-6 py-5 backdrop-blur-sm sm:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-moss">Panel admin</p>
            <p className="mt-0.5 font-display text-xl italic text-ink">{profile.full_name}</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <nav className="border-b border-sand bg-white/40 px-6 sm:px-10">
        <div className="mx-auto flex max-w-5xl gap-6 text-sm">
          <Link
            href="/admin"
            className="border-b-2 border-transparent py-3 text-ink/60 transition hover:border-moss hover:text-ink"
          >
            Inicio
          </Link>
          <Link
            href="/admin/alumnos"
            className="border-b-2 border-transparent py-3 text-ink/60 transition hover:border-moss hover:text-ink"
          >
            Alumnos
          </Link>
          <Link
            href="/admin/horarios"
            className="border-b-2 border-transparent py-3 text-ink/60 transition hover:border-moss hover:text-ink"
          >
            Horarios
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">{children}</main>
    </div>
  )
}
