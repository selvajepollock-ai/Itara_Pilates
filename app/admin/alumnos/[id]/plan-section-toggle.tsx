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
        className="disclosure-toggle"
      >
        <span className="text-sm font-semibold text-ink/80">Cambiar plan / ajustar fecha manual</span>
        <span className={`disclosure-chevron ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={16} strokeWidth={2.5} />
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
