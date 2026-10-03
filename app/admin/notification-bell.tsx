'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { relativeTime } from '@/lib/relative-time'
import { approveRecoveryRequest, rejectRecoveryRequest } from '@/app/actions/recovery'
import { useSidePanel } from '@/app/components/use-side-panel'
import { getNotificationInbox } from './notification-counts'
import type { InboxItem } from './notification-types'

// TODO: "Marcar todo como leído", el punto de no leído y el filtro "Sin leer": hoy no existe un estado de leído por persona.
// Las notificaciones desaparecen solas cuando se resuelven (o al visitar Avisos, en el caso de las ausencias).

const ART = 'America/Argentina/Buenos_Aires'
const dayART = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: ART }).format(d)

const EMOJI: Record<InboxItem['kind'], { emoji: string; bg: string }> = {
  recovery: { emoji: '🔄', bg: '#E3EEFB' },
  cancellation: { emoji: '🙋‍♀️', bg: '#FDF0D5' },
  plan: { emoji: '📝', bg: '#EFE7FB' },
  signup: { emoji: '🆕', bg: '#E3EEFB' },
  birthday: { emoji: '🎂', bg: '#FCE4EF' },
}
const LATE = { emoji: '⏰', bg: '#FDE6E1' }

/** Pedidos que esperan una acción del estudio. */
const NEEDS_RESPONSE: InboxItem['kind'][] = ['recovery', 'plan', 'signup']

type Filter = 'todas' | 'pendientes'
type Group = { title: string; items: InboxItem[] }

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

function shortDay(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`)
  const s = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
  return s.replace(/\./g, '').replace(',', '')
}

function buildGroups(items: InboxItem[]): Group[] {
  const today = dayART(new Date())
  const yesterday = dayART(new Date(Date.now() - 86_400_000))
  const response = items.filter((i) => NEEDS_RESPONSE.includes(i.kind))
  const rest = items.filter((i) => !NEEDS_RESPONSE.includes(i.kind) && i.kind !== 'birthday')
  const birthdays = items.filter((i) => i.kind === 'birthday')

  const groups: Group[] = []
  if (response.length) groups.push({ title: 'Requiere tu respuesta', items: response })

  const byDay = new Map<string, InboxItem[]>()
  for (const i of rest) {
    const day = i.at ? dayART(new Date(i.at)) : 'sin-fecha'
    byDay.set(day, [...(byDay.get(day) ?? []), i])
  }
  for (const [day, list] of [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0]))) {
    groups.push({ title: day === today ? 'Hoy' : day === yesterday ? 'Ayer' : day === 'sin-fecha' ? 'Antes' : shortDay(day), items: list })
  }
  if (birthdays.length) groups.push({ title: 'Cumpleaños próximos', items: birthdays })
  return groups
}

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

function RecoveryActions({ creditId, onDone }: { creditId: string; onDone: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(kind: 'approve' | 'reject') {
    if (kind === 'reject' && !confirm('¿Rechazar este horario? El alumno va a poder elegir otro.')) return
    setError(null)
    startTransition(async () => {
      const res = kind === 'approve' ? await approveRecoveryRequest(creditId) : await rejectRecoveryRequest(creditId)
      if (res?.error) {
        setError(res.error)
        return
      }
      onDone()
    })
  }

  return (
    <div className="mt-2.5">
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run('approve')}
          className="inline-flex h-[34px] items-center rounded-[10px] bg-moss px-3.5 text-[13px] font-semibold text-white transition hover:bg-moss-dark disabled:opacity-50"
        >
          {isPending ? '...' : 'Aprobar'}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run('reject')}
          className="inline-flex h-[34px] items-center rounded-[10px] border border-edge-strong bg-white px-3.5 text-[13px] font-medium text-ink transition hover:border-moss disabled:opacity-50"
        >
          Rechazar
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
    </div>
  )
}

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
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [items, setItems] = useState<InboxItem[]>(initialItems)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<Filter>('todas')
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(() => getNotificationInbox().then((r) => setItems(r.items)), [])

  // Refresco periódico + cuando cambiás de pantalla (por si resolviste algo).
  useEffect(() => {
    let active = true
    const run = () => getNotificationInbox().then((r) => active && setItems(r.items))
    run()
    const interval = setInterval(run, 3 * 60 * 1000)
    return () => {
      active = false
      clearInterval(interval)
    }
  }, [pathname])

  const close = useCallback(() => setOpen(false), [])
  useSidePanel(panelRef, { isMobile: isMobile && open, onClose: close, resetKey: open ? 'open' : 'closed' })

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!isMobile && ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open, isMobile])

  const count = items.length
  const visible = useMemo(
    () => (filter === 'pendientes' ? items.filter((i) => NEEDS_RESPONSE.includes(i.kind)) : items),
    [items, filter]
  )
  const groups = useMemo(() => buildGroups(visible), [visible])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Notificaciones${count ? `, ${count} ${count === 1 ? 'pendiente' : 'pendientes'}` : ''}`}
        className={`relative flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border text-[19px] transition ${
          count > 0 ? 'border-[#F3D98B] bg-[#FFF4DB]' : 'border-edge-strong bg-white hover:border-moss'
        }`}
      >
        <span aria-hidden>🔔</span>
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#E5484D] px-1 text-[11px] font-bold leading-none text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" aria-hidden onClick={close} />
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Notificaciones"
            tabIndex={-1}
            className={`fixed inset-0 z-50 flex flex-col bg-white outline-none lg:absolute lg:inset-auto lg:top-full lg:mt-2 lg:max-h-[80vh] lg:w-[420px] lg:rounded-[20px] lg:border lg:border-edge lg:shadow-[0_20px_50px_rgba(43,42,38,0.18)] ${
              align === 'left' ? 'lg:left-0' : 'lg:right-0'
            }`}
          >
            <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-5">
              <h2 className="font-display text-2xl font-normal italic leading-tight text-ink">Notificaciones</h2>
              <button
                type="button"
                aria-label="Cerrar notificaciones"
                onClick={close}
                className="-mr-2 flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft lg:hidden"
              >
                <X size={20} />
              </button>
            </div>

            <div role="tablist" aria-label="Filtro" className="flex gap-2 px-5 pb-3">
              {(
                [
                  ['todas', 'Todas'],
                  ['pendientes', 'Pendientes'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={filter === key}
                  onClick={() => setFilter(key)}
                  className={`min-h-[34px] rounded-full border px-3.5 text-[13px] font-medium transition ${
                    filter === key ? 'border-[#2B2A26] bg-[#2B2A26] text-white' : 'border-edge-strong bg-white text-ink hover:border-moss'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto border-t border-edge-row">
              {groups.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <p className="text-4xl" aria-hidden>
                    ✨
                  </p>
                  <p className="mt-2 text-base font-semibold text-ink">Estás al día</p>
                  <p className="mt-1 text-sm text-muted">No hay notificaciones pendientes.</p>
                </div>
              ) : (
                groups.map((g) => (
                  <section key={g.title}>
                    <h3 className="px-5 pb-1.5 pt-4 text-[11.5px] font-semibold uppercase tracking-wide text-muted">{g.title}</h3>
                    <ul>
                      {g.items.map((item) => {
                        const look = item.kind === 'cancellation' && item.late ? LATE : EMOJI[item.kind]
                        const showViewButton = item.kind === 'plan' || item.kind === 'signup'
                        return (
                          <li key={item.key} className="px-5 py-3 transition hover:bg-edge-head">
                            <div className="flex items-start gap-3">
                              <span
                                aria-hidden
                                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[14px] text-[22px]"
                                style={{ background: look.bg }}
                              >
                                {look.emoji}
                              </span>
                              <div className="min-w-0 flex-1">
                                <Link href={item.href} onClick={close} className="block text-sm leading-snug text-ink">
                                  <span className="font-semibold">{item.name}</span> {item.rest}
                                </Link>
                                {item.at && <p className="mt-0.5 text-xs text-muted">{cap(relativeTime(item.at))}</p>}
                                {item.kind === 'recovery' && item.creditId && (
                                  <RecoveryActions
                                    creditId={item.creditId}
                                    onDone={() => {
                                      load()
                                      router.refresh()
                                    }}
                                  />
                                )}
                                {showViewButton && (
                                  <Link
                                    href={item.href}
                                    onClick={close}
                                    className="mt-2.5 inline-flex h-[34px] items-center rounded-[10px] border border-edge-strong bg-white px-3.5 text-[13px] font-medium text-ink transition hover:border-moss"
                                  >
                                    Ver pedido
                                  </Link>
                                )}
                              </div>
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </section>
                ))
              )}
            </div>

            <Link
              href="/admin/avisos"
              onClick={close}
              className="block border-t border-edge px-5 py-3.5 text-center text-[13px] font-semibold text-moss hover:bg-edge-head max-lg:pb-[calc(14px+env(safe-area-inset-bottom))]"
            >
              Ver toda la actividad →
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
