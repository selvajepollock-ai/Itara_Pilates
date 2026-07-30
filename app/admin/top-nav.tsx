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

export function TopNav({
  fullName,
  pendingCount = 0,
  birthdaysToday = 0,
}: {
  fullName: string
  pendingCount?: number
  birthdaysToday?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const NAV_ITEMS = [
    { href: '/admin', label: 'Inicio', icon: LayoutDashboard, exact: true, badge: birthdaysToday },
    { href: '/admin/alumnos', label: 'Alumnos', icon: Users, badge: 0 },
    { href: '/admin/instructores', label: 'Equipo', icon: UserCog, badge: 0 },
    { href: '/admin/horarios', label: 'Horarios', icon: CalendarDays, badge: 0 },
    { href: '/admin/planes', label: 'Planes', icon: CreditCard, badge: 0 },
    { href: '/admin/avisos', label: 'Avisos', icon: Bell, badge: pendingCount },
    { href: '/admin/reportes', label: 'Reportes', icon: BarChart3, badge: 0 },
    { href: '/admin/notificaciones', label: 'Notif.', icon: Megaphone, badge: 0 },
  ]

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
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact, badge }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex shrink-0 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] transition ${
                isActive ? 'bg-moss text-white' : 'text-ink/50 hover:bg-linen'
              }`}
            >
              <Icon size={16} strokeWidth={2} />
              {label}
              {badge > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[9px] font-medium text-white">
                  {href === '/admin' ? '🎂' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
