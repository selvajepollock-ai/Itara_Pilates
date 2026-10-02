'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Search } from 'lucide-react'
import { getNotificationCounts } from './notification-counts'
import { NotificationBell } from './notification-bell'
import { NAV_GROUPS, isNavActive } from './nav-config'
import { UserMenu } from './user-menu'
import type { InboxItem } from './notification-types'

export function Sidebar({
  fullName,
  pendingSignups: initialPendingSignups = 0,
  overdueCount = 0,
  isDeveloper = false,
  notifications = [],
}: {
  fullName: string
  pendingSignups?: number
  overdueCount?: number
  isDeveloper?: boolean
  notifications?: InboxItem[]
}) {
  const pathname = usePathname()
  const [pendingSignups, setPendingSignups] = useState(initialPendingSignups)

  useEffect(() => {
    const interval = setInterval(async () => {
      const counts = await getNotificationCounts()
      setPendingSignups(counts.pendingSignups)
    }, 5 * 60 * 1000) // cada 5 minutos
    return () => clearInterval(interval)
  }, [])

  const badges = { signups: pendingSignups, overdue: overdueCount }

  return (
    <aside className="sticky top-0 flex h-screen w-[248px] shrink-0 flex-col border-r border-edge bg-white">
      <div className="flex items-center justify-between px-5 py-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-emblem.png" alt="Itara Pilates" className="h-10 w-10 object-contain" />
          <div>
            <p className="font-display text-lg italic leading-tight text-ink">Itara</p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-ink/40">Pilates</p>
          </div>
        </div>
        <NotificationBell initialItems={notifications} align="left" />
      </div>

      {/* TODO: buscador global. Por ahora lleva a Alumnos con el campo de búsqueda activo. */}
      <div className="px-3">
        <Link
          href="/admin/alumnos?buscar=1"
          className="flex min-h-[40px] items-center gap-2.5 rounded-[10px] border border-edge-strong bg-white px-3 text-sm text-muted transition hover:border-moss hover:text-ink"
        >
          <Search size={15} />
          Buscar alumno
        </Link>
      </div>

      <nav aria-label="Menú principal" className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="px-3 pb-1.5 text-xs font-medium text-muted">{group.label}</p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isNavActive(pathname, item)
                const badge = item.badge ? badges[item.badge] : 0
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex h-10 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition ${
                      active ? 'bg-moss text-white' : 'text-ink/70 hover:bg-moss-soft hover:text-ink'
                    }`}
                  >
                    <Icon size={17} strokeWidth={2} />
                    <span className="flex-1">{item.label}</span>
                    {badge > 0 && (
                      <span
                        className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                          active ? 'bg-white text-moss-dark' : 'bg-danger text-white'
                        }`}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <UserMenu fullName={fullName} isDeveloper={isDeveloper} />
    </aside>
  )
}
