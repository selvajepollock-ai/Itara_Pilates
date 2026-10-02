'use client'

import { useEffect, useRef, useState } from 'react'
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

/** Botón "⋯" con menú. Cierra con Escape o al hacer click afuera. */
export function DropdownMenu({
  label,
  items,
  buttonClassName = 'h-[34px] w-[34px]',
}: {
  label: string
  items: MenuItem[]
  buttonClassName?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-center rounded-[10px] border border-transparent text-muted transition hover:border-edge-strong hover:bg-white hover:text-ink ${buttonClassName}`}
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div role="menu" className="surface-card absolute right-0 top-full z-30 mt-1 w-52 p-1.5">
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
        </div>
      )}
    </div>
  )
}
