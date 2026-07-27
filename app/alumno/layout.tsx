import Link from 'next/link'
import { Instagram } from 'lucide-react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LogoutButton } from '@/lib/supabase/logout-button'

export default async function AlumnoLayout({
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
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-linen">
      <header className="border-b border-sand bg-white/70 px-6 py-5 backdrop-blur-sm sm:px-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-emblem.png" alt="Itara Pilates" className="h-9 w-9 object-contain" />
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-moss">Mi estudio</p>
              <p className="mt-0.5 font-display text-xl italic text-ink">{profile?.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://www.instagram.com/itara_estudio_de_pilates/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-sand text-ink/50 transition hover:border-moss hover:text-moss"
            >
              <Instagram size={15} />
            </a>
            <Link
              href="/alumno"
              className="rounded-full border border-sand px-4 py-1.5 text-xs font-medium text-ink/70 transition hover:border-moss hover:text-moss"
            >
              Inicio
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">{children}</main>
    </div>
  )
}
