'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, Instagram, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

/** Encabezado del panel del alumno: logo, Instagram y "Mi perfil" (con Cerrar sesión adentro). */
export function AlumnoHeader({ initial, isAdmin }: { initial: string; isAdmin: boolean }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  async function logout() {
    await createClient().auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // En celular, "Elegir clase" lleva su propia barra con "‹".
  const hideOnMobile = pathname.startsWith('/alumno/recuperar') ? 'max-lg:hidden' : ''
  const item =
    'flex min-h-[44px] w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-sm text-ink hover:bg-moss-soft'

  return (
    <header className={`border-b border-edge bg-white ${hideOnMobile}`}>
      <div className="mx-auto flex max-w-[1120px] items-center justify-between gap-3 px-4 py-3.5 sm:px-8">
        <Link href="/alumno" className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-emblem.png" alt="" className="h-9 w-9 shrink-0 object-contain" />
          <span className="truncate font-display text-xl italic text-ink">Itara Pilates</span>
        </Link>

        <div className="flex items-center gap-2.5">
          <a
            href="https://www.instagram.com/itara_estudio_de_pilates/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram de Itara Pilates"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-edge-strong text-ink transition hover:border-moss hover:text-moss"
          >
            <Instagram size={17} />
          </a>

          <div ref={ref} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 items-center gap-2 rounded-full border border-edge-strong bg-white pl-1.5 pr-3 text-sm font-medium text-ink transition hover:border-moss"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-moss text-xs font-semibold text-white">
                {initial}
              </span>
              <span className="max-sm:sr-only">Mi perfil</span>
              <ChevronDown size={14} className="text-muted" aria-hidden />
            </button>
            {open && (
              <div role="menu" className="surface-card absolute right-0 top-full z-30 mt-1 w-52 p-1.5">
                <Link role="menuitem" href="/alumno/perfil" onClick={() => setOpen(false)} className={item}>
                  <User size={15} /> Mi perfil
                </Link>
                {isAdmin && (
                  <Link role="menuitem" href="/admin" onClick={() => setOpen(false)} className={item}>
                    <ArrowLeft size={15} /> Volver al panel
                  </Link>
                )}
                <button type="button" role="menuitem" onClick={logout} className={`${item} border-t border-edge-divider`}>
                  <LogOut size={15} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
