import Link from 'next/link'
import { Instagram, ArrowLeft } from 'lucide-react'
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
    .select('roles')
    .eq('id', user.id)
    .single()
  const isAdmin = profile?.roles?.includes('admin') ?? false

  return (
    <div className="min-h-screen bg-linen">
      <header className="border-b border-sand bg-white/70 px-6 py-5 backdrop-blur-sm sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div className="flex min-w-0 items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-emblem.png" alt="Itara Pilates" className="h-9 w-9 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="eyebrow">Estudio</p>
              <p className="mt-0.5 truncate font-display text-xl italic text-ink">Itara Pilates</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="btn-secondary-sm"
              >
                <ArrowLeft size={13} />
                Volver al panel
              </Link>
            )}
            <a
              href="https://www.instagram.com/itara_estudio_de_pilates/"
              target="_blank"
              rel="noopener noreferrer"
              className="icon-btn-sm"
            >
              <Instagram size={15} />
            </a>
            <Link
              href="/alumno"
              className="btn-secondary-sm"
            >
              Inicio
            </Link>
            <Link
              href="/alumno/perfil"
              className="btn-secondary-sm"
            >
              Mi perfil
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10 sm:px-10">{children}</main>
    </div>
  )
}
