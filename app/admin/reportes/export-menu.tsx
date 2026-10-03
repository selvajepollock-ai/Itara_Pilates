'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { ChevronDown, Download } from 'lucide-react'
import { exportToPDF, exportWorkbook } from '@/lib/export'
import { buildPeriodReport } from './report-actions'
import { exportFullBackup } from './backup-actions'

type Kind = 'pdf' | 'excel' | 'backup'

const ITEMS: { kind: Kind; title: string; description: string }[] = [
  { kind: 'pdf', title: 'Resumen del período (PDF)', description: 'Lo que ves en esta pantalla, listo para imprimir o compartir' },
  { kind: 'excel', title: 'Detalle del período (Excel)', description: 'Todos los pagos y la ocupación del período, para analizar' },
  { kind: 'backup', title: 'Copia de seguridad completa (.xlsx)', description: 'Todos los datos del estudio, sin importar el período' },
]

/** Un único "Exportar": reúne el PDF, el Excel del período y la copia de seguridad. Usa las mismas acciones de siempre. */
export function ExportMenu({ from, to }: { from: string; to: string }) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function run(kind: Kind) {
    setOpen(false)
    setMessage(null)
    startTransition(async () => {
      if (kind === 'backup') {
        const res = await exportFullBackup()
        if (res.error || !res.sheets) return setMessage({ tone: 'error', text: res.error ?? 'No se pudo generar la copia.' })
        const stamp = new Date().toISOString().slice(0, 10)
        await exportWorkbook(`itara-backup-${stamp}`, res.sheets)
        return setMessage({ tone: 'ok', text: `Copia descargada — ${new Date().toLocaleString('es-AR')}` })
      }

      const res = await buildPeriodReport({ from, to })
      if (res.error || !res.sheets) return setMessage({ tone: 'error', text: res.error ?? 'No se pudo generar el reporte.' })
      const base = `itara-reporte-${from}_a_${to}`
      if (kind === 'excel') {
        await exportWorkbook(base, res.sheets)
      } else {
        // TODO: el PDF sigue siendo la hoja "Resumen" (concepto / valor), no una copia fiel de la pantalla.
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
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={isPending}
        onClick={() => setOpen((v) => !v)}
        className="btn-primary"
      >
        <Download size={15} />
        {isPending ? 'Generando...' : 'Exportar'}
        <ChevronDown size={14} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30 bg-ink/30 lg:hidden" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="fixed inset-x-0 bottom-0 z-40 rounded-t-2xl border-t border-edge bg-white p-3 pb-[calc(12px+env(safe-area-inset-bottom))] lg:absolute lg:inset-x-auto lg:bottom-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[330px] lg:rounded-[14px] lg:border lg:p-2 lg:shadow-[0_12px_32px_rgba(43,42,38,0.14)]"
          >
            {ITEMS.map((it, i) => (
              <div key={it.kind} className={i === 2 ? 'mt-1 border-t border-edge-divider pt-1' : ''}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => run(it.kind)}
                  className="block w-full rounded-[10px] px-3 py-2.5 text-left transition hover:bg-moss-soft"
                >
                  <span className="block text-sm font-semibold text-ink">{it.title}</span>
                  <span className="mt-0.5 block text-[12.5px] text-muted">{it.description}</span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
      {message && (
        <p className={`absolute right-0 top-full mt-2 whitespace-nowrap text-xs ${message.tone === 'ok' ? 'text-moss-dark' : 'text-danger'}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
