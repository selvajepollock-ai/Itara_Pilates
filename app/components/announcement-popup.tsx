'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Megaphone, X } from 'lucide-react'
import { dismissAnnouncement } from '@/app/actions/announcements'
import { useSidePanel } from '@/app/components/use-side-panel'

/**
 * Aviso del estudio como ventana emergente: aparece al entrar, de a uno, y al cerrarlo
 * (Entendido, la ✕ o Escape) no vuelve a mostrarse a esa persona. El comunicado sigue vigente para el resto.
 */
export function AnnouncementPopup({ items }: { items: { id: string; message: string }[] }) {
  const router = useRouter()
  const panelRef = useRef<HTMLDivElement>(null)
  const [closed, setClosed] = useState<string[]>([])
  const [, startTransition] = useTransition()

  const pending = items.filter((i) => !closed.includes(i.id))
  const current = pending[0]

  function close() {
    if (!current) return
    const id = current.id
    setClosed((c) => [...c, id])
    startTransition(async () => {
      await dismissAnnouncement(id)
      if (pending.length <= 1) router.refresh()
    })
  }

  useSidePanel(panelRef, { isMobile: true, onClose: close, resetKey: current?.id ?? 'none' })

  if (!current) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Aviso del estudio"
        tabIndex={-1}
        className="relative w-full max-w-[420px] rounded-[22px] border-t-4 border-t-[#C9962E] bg-white p-6 shadow-[0_20px_50px_rgba(43,42,38,0.25)] outline-none"
      >
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={close}
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-[10px] text-muted hover:bg-moss-soft hover:text-ink"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-warning-ink">
          <Megaphone size={16} aria-hidden />
          <p className="text-[11px] font-semibold uppercase tracking-wide">Aviso del estudio</p>
          {pending.length > 1 && <span className="text-[11px] text-muted">· 1 de {pending.length}</span>}
        </div>
        <p className="mt-3 whitespace-pre-wrap text-base leading-snug text-ink">{current.message}</p>

        <button
          type="button"
          onClick={close}
          className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-[12px] bg-[#2B2A26] text-sm font-semibold text-white transition hover:bg-black"
        >
          Entendido
        </button>
      </div>
    </div>
  )
}
