'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Users, UserCog, CalendarDays, CreditCard, Bell, BarChart3, Megaphone, Instagram, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getNotificationCounts } from './notification-counts'

export function Sidebar({
  fullName,
  pendingCount: initialPendingCount = 0,
  birthdaysToday: initialBirthdaysToday = 0,
  pendingSignups: initialPendingSignups = 0,
}: {
  fullName: string
  pendingCount?: number
  birthdaysToday?: number
  pendingSignups?: number
}) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [pendingCount, setPendingCount] = useState(initialPendingCount)
  const [birthdaysToday, setBirthdaysToday] = useState(initialBirthdaysToday)
  const [pendingSignups, setPendingSignups] = useState(initialPendingSignups)

  useEffect(() => {
    const interval = setInterval(async () => {
      const counts = await getNotificationCounts()
      setPendingCount(counts.pendingCount)
      setBirthdaysToday(counts.birthdaysToday)
      setPendingSignups(counts.pendingSignups)
    }, 5 * 60 * 1000) // cada 5 minutos
    return () => clearInterval(interval)
  }, [])

  const NAV_ITEMS = [
    { href: '/admin', label: 'Inicio', icon: LayoutDashboard, exact: true, badge: birthdaysToday },
    { href: '/admin/alumnos', label: 'Alumnos', icon: Users, badge: pendingSignups },
    { href: '/admin/instructores', label: 'Equipo', icon: UserCog, badge: 0 },
    { href: '/admin/horarios', label: 'Horarios', icon: CalendarDays, badge: 0 },
    { href: '/admin/planes', label: 'Planes', icon: CreditCard, badge: 0 },
    { href: '/admin/avisos', label: 'Avisos', icon: Bell, badge: pendingCount },
    { href: '/admin/reportes', label: 'Reportes', icon: BarChart3, badge: 0 },
    { href: '/admin/notificaciones', label: 'Notificaciones', icon: Megaphone, badge: 0 },
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-sand bg-white">
      <div className="flex items-center gap-3 px-6 py-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo-emblem.png" alt="Itara Pilates" className="h-10 w-10 object-contain" />
        <div>
          <p className="font-display text-lg italic leading-tight text-ink">Itara</p>
          <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">Pilates</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact, badge }) => {
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
              <span className="flex-1">{label}</span>
              {badge > 0 && (
                <span
                  className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-medium ${
                    isActive ? 'bg-white text-moss' : 'bg-clay text-white'
                  }`}
                >
                  {href === '/admin' ? '🎂' : badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      <div className="border-t border-sand px-3 py-4">
        <Link
          href="/admin/perfil"
          className="flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-linen"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-medium text-ink">
            {fullName.slice(0, 1).toUpperCase()}
          </div>
          <p className="flex-1 truncate text-sm text-ink">{fullName}</p>
        </Link>
        <button
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/50 transition hover:bg-linen hover:text-clay"
        >
          <LogOut size={17} strokeWidth={2} />
          Cerrar sesión
        </button>
        <a
          href="https://www.instagram.com/itara_estudio_de_pilates/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-ink/50 transition hover:bg-linen hover:text-moss"
        >
          <Instagram size={17} strokeWidth={2} />
          Instagram
        </a>
      </div>
    </aside>
  )
}
