'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCog,
  CalendarDays,
  CreditCard,
  Bell,
  BarChart3,
  Megaphone,
  LogOut,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV_ITEMS = [
  { href: '/admin', label: 'Inicio', icon: LayoutDashboard, exact: true },
  { href: '/admin/alumnos', label: 'Alumnos', icon: Users },
  { href: '/admin/instructores', label: 'Instructores', icon: UserCog },
  { href: '/admin/horarios', label: 'Horarios', icon: CalendarDays },
  { href: '/admin/planes', label: 'Planes', icon: CreditCard },
  { href: '/admin/avisos', label: 'Avisos', icon: Bell },
  { href: '/admin/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/admin/notificaciones', label: 'Notif.', icon: Megaphone },
]

export function TopNav({ fullName }: { fullName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="border-b border-sand bg-white lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Link href="/admin/perfil" className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-emblem.png" alt="Itara Pilates" className="h-8 w-8 object-contain" />
          <div>
            <p className="font-display text-sm italic leading-tight text-ink">Itara</p>
            <p className="max-w-[140px] truncate text-[11px] text-ink/40">{fullName}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-sand text-ink/50 hover:border-clay hover:text-clay"
        >
          <LogOut size={15} />
        </button>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] transition ${
                isActive ? 'bg-moss text-white' : 'text-ink/50 hover:bg-linen'
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
