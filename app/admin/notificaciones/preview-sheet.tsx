'use client'

import { useEffect, useRef } from 'react'
import { useSidePanel } from '@/app/components/use-side-panel'

/**
 * Hoja inferior para tablet y celular: muestra la vista previa y el resumen.
 * Se cierra con "Cerrar", deslizando hacia abajo o tocando afuera. En tablet mide como máximo 520 px.
 */
export function PreviewSheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
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
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Así lo van a ver">
      <button type="button" aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 cursor-default bg-ink/30" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 mx-auto max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-t-[22px] bg-white px-4 pb-[calc(16px+env(safe-area-inset-bottom))] pt-2 outline-none"
      >
        {/* Asa para deslizar hacia abajo */}
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
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-semibold text-ink">Así lo van a ver</p>
          <button type="button" onClick={onClose} className="flex h-11 items-center rounded-[10px] px-3 text-sm font-medium text-moss hover:bg-moss-soft">
            Cerrar
          </button>
        </div>
        <div className="mt-2 space-y-4">{children}</div>
      </div>
    </div>
  )
}
