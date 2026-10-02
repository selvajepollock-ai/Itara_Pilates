'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, MoreHorizontal } from 'lucide-react'
import { NAV_GROUPS, isNavActive, type NavItem } from './nav-config'
import { AccountItems } from './user-menu'

const ALL_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items)
const MAIN_HREFS = ['/admin', '/admin/horarios', '/admin/alumnos', '/admin/pagos']
const MAIN_ITEMS = MAIN_HREFS.map((h) => ALL_ITEMS.find((i) => i.href === h)!)
const MORE_GROUPS = NAV_GROUPS.map((g) => ({
  ...g,
  items: g.items.filter((i) => !MAIN_HREFS.includes(i.href)),
})).filter((g) => g.items.length > 0)

/** Barra inferior fija (< 1024 px). "Más" abre una hoja con el resto del menú. */
export function BottomNav({
  pendingSignups = 0,
  overdueCount = 0,
  isDeveloper = false,
}: {
  pendingSignups?: number
  overdueCount?: number
  isDeveloper?: boolean
}) {
  const pathname = usePathname()
  const [moreOpen, setMoreOpen] = useState(false)
  const badges = { signups: pendingSignups, overdue: overdueCount }

  useEffect(() => setMoreOpen(false), [pathname])

  const moreActive = MORE_GROUPS.some((g) => g.items.some((i) => isNavActive(pathname, i)))

  return (
    <>
      <nav
        aria-label="Menú principal"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <ul className="mx-auto grid max-w-xl grid-cols-5">
          {MAIN_ITEMS.map((item) => {
            const active = isNavActive(pathname, item)
            const badge = item.badge ? badges[item.badge] : 0
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                    active ? 'text-moss-dark' : 'text-muted'
                  }`}
                >
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full ${active ? 'bg-moss-soft' : ''}`}
                  >
                    <Icon size={19} strokeWidth={2} />
                  </span>
                  {item.label}
                  {badge > 0 && (
                    <span className="absolute right-3 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold tabular-nums text-white">
                      {badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
          <li>
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                moreActive ? 'text-moss-dark' : 'text-muted'
              }`}
            >
              <span
                className={`flex h-7 w-12 items-center justify-center rounded-full ${moreActive ? 'bg-moss-soft' : ''}`}
              >
                <MoreHorizontal size={19} strokeWidth={2} />
              </span>
              Más
            </button>
          </li>
        </ul>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Más opciones">
          <button
            type="button"
            aria-label="Cerrar"
            className="absolute inset-0 bg-ink/30"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-edge bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl italic text-ink">Más</p>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setMoreOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft"
              >
                <X size={18} />
              </button>
            </div>

            {MORE_GROUPS.map((group) => (
              <div key={group.label} className="mt-3">
                <p className="px-3 pb-1 text-xs font-medium text-muted">{group.label}</p>
                {group.items.map((item) => {
                  const Icon = item.icon
                  const active = isNavActive(pathname, item)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className={`flex min-h-[44px] items-center gap-3 rounded-[10px] px-3 text-sm ${
                        active ? 'bg-moss-soft font-medium text-moss-dark' : 'text-ink/70 hover:bg-moss-soft'
                      }`}
                    >
                      <Icon size={17} />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            ))}

            <div className="mt-3 border-t border-edge pt-2">
              <Link
                href="/admin/perfil"
                onClick={() => setMoreOpen(false)}
                className="flex min-h-[44px] items-center rounded-[10px] px-3 text-sm text-ink/70 hover:bg-moss-soft"
              >
                Mi perfil
              </Link>
              <AccountItems isDeveloper={isDeveloper} onNavigate={() => setMoreOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
