'use client'

import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Comportamiento común de los paneles laterales (ficha del alumno, detalle de clase):
 * Escape cierra y, en celular (pantalla completa), se bloquea el scroll de atrás y el foco queda adentro.
 * `resetKey` vuelve a enfocar el panel cuando cambia el contenido.
 */
export function useSidePanel(
  panelRef: RefObject<HTMLElement>,
  { isMobile, onClose, resetKey }: { isMobile: boolean; onClose: () => void; resetKey: string }
) {
  // Escape cierra (salvo que haya un modal encima, que lo maneja solo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (document.querySelector('[role="dialog"][aria-label="Registrar un pago"]')) return
      onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    panel.focus()
    if (!isMobile) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusable = panel.querySelectorAll<HTMLElement>(FOCUSABLE)
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [panelRef, isMobile, resetKey])
}
