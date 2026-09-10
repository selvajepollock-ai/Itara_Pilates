'use client'

import { FileSpreadsheet, FileText } from 'lucide-react'
import { exportToExcel, exportToPDF } from '@/lib/export'

type ClassRow = { label: string; room: string; enrolled: number; capacity: number; pct: number }
type AbsenceRow = { name: string; count: number }

export function ReportExportButtons({
  month,
  totalIncome,
  dropInIncome,
  incomeByPlan,
  classRows,
  absenceRanking,
}: {
  month: string
  totalIncome: number
  dropInIncome: number
  incomeByPlan: [string, number][]
  classRows: ClassRow[]
  absenceRanking: AbsenceRow[]
}) {
  function handleExcel() {
    exportToExcel(`reporte-${month}`, 'Ingresos', [
      { Concepto: 'Total general', Monto: totalIncome + dropInIncome },
      { Concepto: 'Cuotas', Monto: totalIncome },
      { Concepto: 'Clases sueltas', Monto: dropInIncome },
      ...incomeByPlan.map(([plan, amount]) => ({ Concepto: `Plan: ${plan}`, Monto: amount })),
    ])
  }

  function handlePDF() {
    const columns = ['Clase', 'Sala', 'Ocupación', '%']
    const rows = classRows.map((c) => [c.label, c.room, `${c.enrolled}/${c.capacity}`, `${c.pct}%`])
    exportToPDF(`reporte-${month}`, `Reporte del estudio — ${month}`, columns, rows)
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExcel}
        className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-2 text-xs font-medium text-ink/70 transition hover:border-moss hover:text-moss"
      >
        <FileSpreadsheet size={14} />
        Excel
      </button>
      <button
        onClick={handlePDF}
        className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-2 text-xs font-medium text-ink/70 transition hover:border-moss hover:text-moss"
      >
        <FileText size={14} />
        PDF
      </button>
    </div>
  )
}
