'use client'

import { FileSpreadsheet, FileText } from 'lucide-react'
import { exportToExcel, exportToPDF } from '@/lib/export'

export function ExportButton({
  filename,
  sheetName,
  title,
  rows,
}: {
  filename: string
  sheetName: string
  title: string
  rows: Record<string, string | number>[]
}) {
  const columns = rows[0] ? Object.keys(rows[0]) : []

  function handleExcel() {
    if (rows.length === 0) return
    exportToExcel(filename, sheetName, rows)
  }

  function handlePDF() {
    if (rows.length === 0) return
    exportToPDF(
      filename,
      title,
      columns,
      rows.map((r) => columns.map((c) => r[c]))
    )
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleExcel}
        disabled={rows.length === 0}
        className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-2 text-xs font-medium text-ink/70 transition hover:border-moss hover:text-moss disabled:opacity-40"
      >
        <FileSpreadsheet size={14} />
        Excel
      </button>
      <button
        onClick={handlePDF}
        disabled={rows.length === 0}
        className="flex items-center gap-1.5 rounded-full border border-sand px-4 py-2 text-xs font-medium text-ink/70 transition hover:border-moss hover:text-moss disabled:opacity-40"
      >
        <FileText size={14} />
        PDF
      </button>
    </div>
  )
}
