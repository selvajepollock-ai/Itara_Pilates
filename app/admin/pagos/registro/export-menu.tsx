'use client'

import { Download } from 'lucide-react'
import { exportToExcel, exportToPDF } from '@/lib/export'

export type ExportSet = {
  label: string
  filename: string
  sheetName: string
  title: string
  rows: Record<string, string | number>[]
}

/**
 * "Exportar": reutiliza los exports de Cuotas y de Clases sueltas (siguen separados, con sus columnas).
 * TODO: export combinado de cuotas y sueltas (hay que definir columnas comunes).
 */
export function ExportMenu({ sets }: { sets: ExportSet[] }) {
  return (
    <details className="group relative">
      <summary className="inline-flex h-11 cursor-pointer list-none items-center gap-2 rounded-[12px] border border-edge-strong bg-white px-3.5 text-sm font-medium text-ink transition hover:border-moss hover:text-moss [&::-webkit-details-marker]:hidden">
        <Download size={15} />
        Exportar
      </summary>
      <div className="surface-card absolute right-0 z-30 mt-1 w-60 p-1.5">
        {sets.map((s) => {
          const columns = s.rows[0] ? Object.keys(s.rows[0]) : []
          const empty = s.rows.length === 0
          const item =
            'flex min-h-[40px] w-full items-center rounded-[8px] px-3 text-left text-sm text-ink/80 transition hover:bg-moss-soft disabled:opacity-40'
          return (
            <div key={s.label} className="py-0.5">
              <p className="px-3 pt-1 text-xs font-semibold text-muted">{s.label}</p>
              <button type="button" disabled={empty} className={item} onClick={() => exportToExcel(s.filename, s.sheetName, s.rows)}>
                Excel
              </button>
              <button
                type="button"
                disabled={empty}
                className={item}
                onClick={() =>
                  exportToPDF(s.filename, s.title, columns, s.rows.map((r) => columns.map((c) => r[c])))
                }
              >
                PDF
              </button>
            </div>
          )
        })}
      </div>
    </details>
  )
}
