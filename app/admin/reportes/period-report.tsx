'use client'

import { useState, useTransition } from 'react'
import { FileSpreadsheet, FileText } from 'lucide-react'
import { exportWorkbook, exportToPDF } from '@/lib/export'
import { buildPeriodReport } from './report-actions'

export function PeriodReport({ from, to }: { from: string; to: string }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function generate(kind: 'excel' | 'pdf') {
    setError(null)
    startTransition(async () => {
      const res = await buildPeriodReport({ from, to })
      if (res.error || !res.sheets) {
        setError(res.error ?? 'No se pudo generar el reporte.')
        return
      }
      const base = `itara-reporte-${from}_a_${to}`
      if (kind === 'excel') {
        await exportWorkbook(base, res.sheets)
      } else {
        const resumen = res.sheets.find((s) => s.name === 'Resumen')?.rows ?? []
        await exportToPDF(
          base,
          `Reporte Itara — ${from} a ${to}`,
          ['Concepto', 'Valor'],
          resumen.map((r) => [String(r.Concepto ?? ''), String(r.Valor ?? '')])
        )
      }
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => generate('excel')}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-full bg-moss px-4 py-2 text-xs font-medium text-white transition hover:bg-moss-dark disabled:opacity-50"
        >
          <FileSpreadsheet size={14} />
          {isPending ? 'Generando...' : 'Reporte completo (Excel)'}
        </button>
        <button
          onClick={() => generate('pdf')}
          disabled={isPending}
          className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-2 text-xs font-medium text-ink/70 transition hover:border-moss hover:text-moss disabled:opacity-50"
        >
          <FileText size={14} />
          Resumen (PDF)
        </button>
      </div>
      {error && <p className="text-xs text-clay">{error}</p>}
    </div>
  )
}
