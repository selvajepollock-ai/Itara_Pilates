'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import {
  clearNotifications,
  deleteNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type MyNotification,
} from '@/app/actions/notifications'
import { relativeTime } from '@/lib/relative-time'
import { useSidePanel } from '@/app/components/use-side-panel'

const EMOJI: Record<string, { emoji: string; bg: string }> = {
  announcement: { emoji: '📣', bg: '#FDF0D5' },
  recovery_approved: { emoji: '✅', bg: '#E3F4E6' },
  recovery_rejected: { emoji: '🔄', bg: '#E3EEFB' },
  class_cancelled: { emoji: '🗓️', bg: '#FDE6E1' },
  spot_freed: { emoji: '🙋‍♀️', bg: '#E3F4E6' },
}
const FALLBACK = { emoji: '🔔', bg: '#FDF0D5' }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setMobile(mq.matches)
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

/**
 * Campanita de la alumna / instructor: su bandeja de avisos, con no leídas, borrar de a una o todas.
 * Los avisos se borran solos a los 30 días.
 */
export function UserNotificationBell() {
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [items, setItems] = useState<MyNotification[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => getMyNotifications().then((r) => setItems(r.items)), [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 3 * 60 * 1000)
    return () => clearInterval(interval)
  }, [load, pathname])

  const close = useCallback(() => setOpen(false), [])
  useSidePanel(panelRef, { isMobile: isMobile && open, onClose: close, resetKey: open ? 'open' : 'closed' })

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!isMobile && ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open, isMobile])

  const unread = items.filter((i) => !i.read).length

  async function openItem(n: MyNotification) {
    setItems((list) => list.map((i) => (i.id === n.id ? { ...i, read: true } : i)))
    close()
    await markNotificationRead(n.id)
    if (n.url) router.push(n.url)
  }

  async function remove(id: string) {
    setItems((list) => list.filter((i) => i.id !== id))
    await deleteNotification(id)
  }

  async function readAll() {
    setItems((list) => list.map((i) => ({ ...i, read: true })))
    await markAllNotificationsRead()
  }

  async function clearAll() {
    if (!confirm('¿Borrar todos los avisos?')) return
    setItems([])
    await clearNotifications()
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Avisos${unread ? `, ${unread} sin leer` : ''}`}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border text-[18px] transition ${
          unread > 0 ? 'border-[#F3D98B] bg-[#FFF4DB]' : 'border-edge-strong bg-white hover:border-moss'
        }`}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#E5484D] px-1 text-[11px] font-bold leading-none text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" aria-hidden onClick={close} />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Avisos"
            tabIndex={-1}
            className="fixed inset-0 z-50 flex flex-col bg-white outline-none lg:absolute lg:inset-auto lg:right-0 lg:top-full lg:mt-2 lg:max-h-[80vh] lg:w-[400px] lg:rounded-[20px] lg:border lg:border-edge lg:shadow-[0_20px_50px_rgba(43,42,38,0.18)]"
          >
            <div className="flex items-center justify-between gap-3 px-5 pb-2 pt-5">
              <h2 className="font-display text-2xl font-normal italic leading-tight text-ink">Avisos</h2>
              <button
                type="button"
                aria-label="Cerrar avisos"
                onClick={close}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft lg:hidden"
              >
                <X size={20} />
              </button>
            </div>

            {items.length > 0 && (
              <div className="flex items-center justify-between gap-3 px-5 pb-3 text-[13px] font-semibold">
                <button type="button" onClick={readAll} disabled={unread === 0} className="text-moss hover:text-moss-dark disabled:text-muted/50">
                  Marcar todo como leído
                </button>
                <button type="button" onClick={clearAll} className="text-muted hover:text-ink">
                  Borrar todo
                </button>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-edge-row">
              {items.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-4xl" aria-hidden>
                    ✨
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink">Estás al día</p>
                  <p className="mt-1 text-sm text-muted">No tenés avisos.</p>
                </div>
              ) : (
                <ul>
                  {items.map((n) => {
                    const look = EMOJI[n.kind] ?? FALLBACK
                    return (
                      <li key={n.id} className={`flex items-start gap-2 border-t border-edge-row px-5 py-3 first:border-t-0 ${n.read ? '' : 'bg-[#FFFCF6]'}`}>
                        <button type="button" onClick={() => openItem(n)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                          <span
                            aria-hidden
                            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] text-[22px]"
                            style={{ background: look.bg }}
                          >
                            {look.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm leading-snug text-ink ${n.read ? '' : 'font-semibold'}`}>{n.title}</span>
                            <span className="mt-0.5 block text-[13px] leading-snug text-muted">{n.body}</span>
                            <span className="mt-1 block text-xs text-muted">{cap(relativeTime(n.createdAt))}</span>
                          </span>
                          {!n.read && <span className="mt-1.5 h-[9px] w-[9px] shrink-0 rounded-full bg-[#E5484D]" aria-label="No leído" />}
                        </button>
                        <button
                          type="button"
                          aria-label="Borrar este aviso"
                          onClick={() => remove(n.id)}
                          className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft hover:text-ink"
                        >
                          <X size={15} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
            <p className="border-t border-edge px-5 py-3 text-center text-xs text-muted max-lg:pb-[calc(12px+env(safe-area-inset-bottom))]">
              Los avisos se borran solos a los 30 días.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
