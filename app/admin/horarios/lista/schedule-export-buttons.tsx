'use client'

import { FileSpreadsheet, FileText } from 'lucide-react'
import { exportToExcel, exportToPDF } from '@/lib/export'
import { formatTime } from '@/lib/day-names'

type ClassRow = {
  id: string
  room: string
  day_of_week: number
  start_time: string
  end_time: string
  capacity: number
  class_types: { name: string } | null
  profiles: { full_name: string } | null
}

const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

export function ScheduleExportButtons({ classes }: { classes: ClassRow[] }) {
  function toRows() {
    return [...classes]
      .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
      .map((c) => ({
        Día: DAY_LABELS[c.day_of_week],
        Horario: `${formatTime(c.start_time)}–${formatTime(c.end_time)}`,
        Tipo: c.class_types?.name ?? '',
        Sala: c.room,
        Instructor: c.profiles?.full_name ?? 'Sin instructor',
        Cupo: c.capacity,
      }))
  }

  function handleExcel() {
    exportToExcel('horarios', 'Horarios', toRows())
  }

  function handlePDF() {
    const rows = toRows()
    exportToPDF(
      'horarios',
      'Horario semanal — Itara Pilates',
      ['Día', 'Horario', 'Tipo', 'Sala', 'Instructor', 'Cupo'],
      rows.map((r) => [r.Día, r.Horario, r.Tipo, r.Sala, r.Instructor, r.Cupo])
    )
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
