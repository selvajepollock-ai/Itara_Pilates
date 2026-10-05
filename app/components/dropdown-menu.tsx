'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'

export type MenuItem = {
  key: string
  label: string
  icon?: React.ReactNode
  href?: string
  onSelect?: () => void
  /** Acción destructiva: se muestra en rojo recién adentro del menú. */
  danger?: boolean
  /** Para mostrar/ocultar por tamaño de pantalla (ej: "lg:hidden"). */
  className?: string
  separatorBefore?: boolean
}

const ITEM =
  'flex min-h-[40px] w-full items-center gap-2.5 rounded-[8px] px-3 text-left text-sm transition hover:bg-moss-soft'

const MENU_WIDTH = 208 // w-52
const MARGIN = 8

type Pos = { left: number; top?: number; bottom?: number }

/**
 * Botón "⋯" con menú. Cierra con Escape o al hacer click afuera.
 * El menú se dibuja arriba de todo (en el body) y se acomoda dentro de la pantalla: así nunca
 * queda cortado por un panel con scroll (como la ficha lateral) ni por el borde de la ventana.
 */
export function DropdownMenu({
  label,
  items,
  buttonClassName = 'h-[34px] w-[34px]',
  openUp = false,
}: {
  label: string
  items: MenuItem[]
  buttonClassName?: string
  /** Prefiere abrir hacia arriba (para botones pegados al borde inferior). */
  openUp?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const btn = buttonRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const menuHeight = menuRef.current?.offsetHeight ?? items.length * 44 + 12
    const left = Math.min(Math.max(r.right - MENU_WIDTH, MARGIN), window.innerWidth - MENU_WIDTH - MARGIN)
    const spaceBelow = window.innerHeight - r.bottom - MARGIN
    const spaceAbove = r.top - MARGIN
    const goUp = openUp ? spaceAbove >= menuHeight || spaceAbove > spaceBelow : spaceBelow < menuHeight && spaceAbove > spaceBelow
    setPos(goUp ? { left, bottom: window.innerHeight - r.top + 4 } : { left, top: r.bottom + 4 })
  }, [items.length, openUp])

  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (buttonRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    // Si algo se desplaza o cambia de tamaño, el menú se cierra (queda en otro lugar).
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-center rounded-[10px] border border-transparent text-muted transition hover:border-edge-strong hover:bg-white hover:text-ink ${buttonClassName}`}
      >
        <MoreHorizontal size={18} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top, bottom: pos?.bottom, width: MENU_WIDTH }}
            className="surface-card z-[70] p-1.5"
          >
            {items.map((item) => {
              const tone = item.danger ? 'text-danger hover:!bg-danger-soft' : 'text-ink/80'
              const cls = `${ITEM} ${tone} ${item.className ?? ''}`
              return (
                <div key={item.key} className={item.separatorBefore ? 'mt-1 border-t border-edge-divider pt-1' : ''}>
                  {item.href ? (
                    <Link role="menuitem" href={item.href} onClick={() => setOpen(false)} className={cls}>
                      {item.icon}
                      {item.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false)
                        item.onSelect?.()
                      }}
                      className={cls}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                  )}
                </div>
              )
            })}
          </div>,
          document.body
        )}
    </div>
  )
}
