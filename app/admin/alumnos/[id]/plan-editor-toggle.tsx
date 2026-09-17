'use client'

import { useState } from 'react'
import { ChevronDown, Settings2 } from 'lucide-react'
import { InfoHint } from '@/app/components/info-hint'

export function PlanEditorToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-6">
      <button type="button" onClick={() => setOpen((v) => !v)} className="disclosure-toggle">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink/80">
          <Settings2 size={15} />
          Editar plan fijo
          <InfoHint text="Cambia el plan de base del alumno — afecta todas las semanas futuras, no solo una fecha puntual." />
        </span>
        <span className={`disclosure-chevron ${open ? 'rotate-180' : ''}`}>
          <ChevronDown size={16} />
        </span>
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  )
}
