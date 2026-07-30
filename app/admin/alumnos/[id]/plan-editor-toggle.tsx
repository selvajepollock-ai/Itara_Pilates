'use client'

import { useState } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'

export function PlanEditorToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl border border-dashed border-sand bg-linen/40 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-ink/60">
          <Settings2 size={15} />
          Editar plan fijo (cambia todas las semanas futuras)
        </span>
        <ChevronDown size={16} className={`text-ink/40 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
