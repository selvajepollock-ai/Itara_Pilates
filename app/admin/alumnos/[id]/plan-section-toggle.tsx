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
        className="flex w-full items-center justify-between rounded-xl border border-sand bg-white px-3.5 py-3 text-left shadow-sm transition hover:border-moss hover:shadow-md"
      >
        <span className="text-sm font-semibold text-ink/80">Cambiar plan / ajustar fecha manual</span>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-moss/10 text-moss transition ${open ? 'rotate-180' : ''}`}
        >
          <ChevronDown size={16} strokeWidth={2.5} />
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
