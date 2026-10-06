'use client'

import { useEffect, useRef } from 'react'
import { useSidePanel } from './use-side-panel'

/**
 * Hoja inferior: se cierra con ✕, deslizando hacia abajo, tocando afuera o con Escape.
 * `className` permite limitar en qué anchos se muestra (ej. "md:hidden").
 */
export function BottomSheet({
  open,
  onClose,
  title,
  className = '',
  maxWidth = 640,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  className?: string
  maxWidth?: number
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const startY = useRef<number | null>(null)
  useSidePanel(panelRef, { isMobile: open, onClose, resetKey: open ? 'open' : 'closed' })

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50 ${className}`} role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 cursor-default bg-ink/30" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        style={{ maxWidth }}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[88vh] w-full overflow-y-auto rounded-t-[22px] bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 outline-none"
      >
        <div
          className="flex cursor-grab justify-center py-2"
          onTouchStart={(e) => (startY.current = e.touches[0].clientY)}
          onTouchEnd={(e) => {
            if (startY.current !== null && e.changedTouches[0].clientY - startY.current > 60) onClose()
            startY.current = null
          }}
        >
          <span className="h-1.5 w-12 rounded-full bg-edge-strong" aria-hidden />
        </div>
        <p className="text-[13px] font-semibold text-ink">{title}</p>
        <div className="mt-2">{children}</div>
        <button type="button" onClick={onClose} className="mt-3 h-12 w-full rounded-[12px] border border-edge-strong text-sm font-medium text-ink">
          Cerrar
        </button>
      </div>
    </div>
  )
}
