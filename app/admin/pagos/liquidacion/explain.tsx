'use client'

import { useState } from 'react'

/** "¿Cómo se calcula?": despliega la nota explicativa. */
export function ExplainToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="text-[13px] font-medium text-moss hover:text-moss-dark"
      >
        ¿Cómo se calcula?
      </button>
      {open && <div className="mt-3 w-full rounded-[12px] bg-edge-head p-4 text-[13px] leading-relaxed text-muted">{children}</div>}
    </>
  )
}
