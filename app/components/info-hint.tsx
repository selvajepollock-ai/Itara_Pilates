'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * "?" chico al lado de un título. Al tocarlo, despliega la explicación en un
 * globo; el resto del tiempo no ocupa lugar. Usar en vez de un párrafo de
 * texto siempre visible debajo de un título de sección.
 */
export function InfoHint({ text, align = 'center' }: { text: string; align?: 'left' | 'center' }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <span className="relative inline-flex" ref={ref}>
      {/* span con role="button", no <button>: este componente se usa seguido adentro
          de otro botón (el de un desplegable), y un <button> anidado rompe el HTML. */}
      <span
        role="button"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            setOpen((v) => !v)
          }
        }}
        className={`flex h-4 w-4 cursor-pointer items-center justify-center rounded-full border text-[10px] leading-none transition ${
          open ? 'border-moss text-moss' : 'border-ink/25 text-ink/40 hover:border-moss hover:text-moss'
        }`}
        aria-label="Más información"
        aria-expanded={open}
      >
        ?
      </span>
      {open && (
        <span
          className={`absolute top-full z-30 mt-1.5 w-56 rounded-lg border border-sand bg-white p-2.5 text-xs font-normal normal-case leading-snug text-ink/60 shadow-lg ${
            align === 'left' ? 'left-0' : 'left-1/2 -translate-x-1/2'
          }`}
        >
          {text}
        </span>
      )}
    </span>
  )
}
