'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, Instagram, LogOut, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ITEM =
  'flex min-h-[44px] w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm text-ink/70 transition hover:bg-moss-soft hover:text-ink'

/** Ítems de "Ver como", Instagram y Cerrar sesión (los usa el menú "⋯" y la hoja "Más" del celular). */
export function AccountItems({ isDeveloper, onNavigate }: { isDeveloper: boolean; onNavigate?: () => void }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      {isDeveloper && (
        <>
          <Link href="/alumno" onClick={onNavigate} className={ITEM}>
            <Eye size={16} />
            Ver como alumno
          </Link>
          <Link href="/instructor" onClick={onNavigate} className={ITEM}>
            <Eye size={16} />
            Ver como instructor
          </Link>
        </>
      )}
      <a
        href="https://www.instagram.com/itara_estudio_de_pilates/"
        target="_blank"
        rel="noopener noreferrer"
        className={ITEM}
      >
        <Instagram size={16} />
        Instagram
      </a>
      <button type="button" onClick={handleLogout} className={`${ITEM} hover:!text-danger`}>
        <LogOut size={16} />
        Cerrar sesión
      </button>
    </>
  )
}

/** Usuario + menú "⋯" al pie del menú lateral. */
export function UserMenu({ fullName, isDeveloper }: { fullName: string; isDeveloper: boolean }) {
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

  return (
    <div ref={ref} className="relative border-t border-edge px-3 py-3">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/perfil"
          className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 rounded-[10px] px-2 transition hover:bg-moss-soft"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-semibold text-ink">
            {fullName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-sm font-medium text-ink">{fullName}</span>
        </Link>
        <button
          type="button"
          aria-label="Más opciones de la cuenta"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted transition hover:bg-moss-soft hover:text-ink"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {open && (
        <div
          role="menu"
          className="surface-card absolute bottom-full left-3 right-3 mb-2 p-1.5"
        >
          <AccountItems isDeveloper={isDeveloper} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}
