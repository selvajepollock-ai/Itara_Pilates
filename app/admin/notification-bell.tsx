'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, UserPlus, Clock, Repeat, CalendarX, Cake } from 'lucide-react'
import { relativeTime } from '@/lib/relative-time'
import { getNotificationInbox } from './notification-counts'
import type { InboxItem } from './notification-types'

const ICONS = {
  signup: UserPlus,
  recovery: Clock,
  plan: Repeat,
  cancellation: CalendarX,
  birthday: Cake,
} as const

export function NotificationBell({
  initialItems,
  align = 'right',
}: {
  initialItems: InboxItem[]
  /** Hacia qué lado se despliega el panel. "left" para cuando la campanita está
   * cerca del borde izquierdo de un contenedor angosto (el menú lateral), así
   * el panel abre hacia el contenido y no se sale de la pantalla. */
  align?: 'left' | 'right'
}) {
  const [items, setItems] = useState<InboxItem[]>(initialItems)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const ref = useRef<HTMLDivElement>(null)

  // Refresco periódico + cuando cambiás de pantalla (por si resolviste algo).
  useEffect(() => {
    let active = true
    const load = () => getNotificationInbox().then((r) => active && setItems(r.items))
    load()
    const interval = setInterval(load, 3 * 60 * 1000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const count = items.length

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="icon-btn relative"
        aria-label={`Notificaciones${count ? ` (${count})` : ''}`}
      >
        <Bell size={16} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-medium text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 mt-2 w-[min(88vw,320px)] overflow-hidden rounded-2xl border border-sand bg-white shadow-xl ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <div className="border-b border-sand px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-ink/50">
              Pendientes ({count})
            </p>
          </div>
          {count === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink/40">Todo al día ✨</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-sand/60 overflow-y-auto">
              {items.map((item) => {
                const Icon = ICONS[item.kind]
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-3 px-4 py-3 transition hover:bg-linen"
                    >
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
                        <Icon size={13} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink">{item.text}</span>
                        {item.at && (
                          <span className="block text-xs text-ink/40">{relativeTime(item.at)}</span>
                        )}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          <Link
            href="/admin/avisos"
            onClick={() => setOpen(false)}
            className="block border-t border-sand px-4 py-2.5 text-center text-xs font-medium text-moss hover:bg-linen"
          >
            Ver todos los avisos
          </Link>
        </div>
      )}
    </div>
  )
}
