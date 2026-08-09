'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function PlanSectionToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-dashed border-sand bg-linen/40 px-3.5 py-2.5 text-left"
      >
        <span className="text-xs font-medium text-ink/50">Cambiar plan / ajustar fecha manual</span>
        <ChevronDown size={14} className={`text-ink/40 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
