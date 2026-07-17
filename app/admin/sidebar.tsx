'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, UserCog, CalendarDays, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/admin', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/admin/alumnos', label: 'Alumnos', icon: Users },
  { href: '/admin/instructores', label: 'Instructores', icon: UserCog },
  { href: '/admin/horarios', label: 'Horarios', icon: CalendarDays },
]

export function Sidebar({ fullName }: { fullName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sand bg-white">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-moss font-display text-sm italic text-white">
          IP
        </div>
        <div>
          <p className="font-display text-lg italic leading-tight text-ink">Itara</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">Pilates</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                isActive
                  ? 'bg-moss text-white shadow-sm'
                  : 'text-ink/60 hover:bg-linen hover:text-ink'
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sand px-3 py-4">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-medium text-ink">
            {fullName.slice(0, 1).toUpperCase()}
          </div>
          <p className="flex-1 truncate text-sm text-ink">{fullName}</p>
        </div>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/50 transition hover:bg-linen hover:text-clay"
        >
          <LogOut size={17} strokeWidth={2} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
