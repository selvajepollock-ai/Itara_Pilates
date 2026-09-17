'use client'

import { useState, useTransition } from 'react'
import { DatabaseBackup } from 'lucide-react'
import { exportWorkbook } from '@/lib/export'
import { exportFullBackup } from './backup-actions'
import { InfoHint } from '@/app/components/info-hint'

export function BackupButton() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [doneAt, setDoneAt] = useState<string | null>(null)

  function handleClick() {
    setError(null)
    setDoneAt(null)
    startTransition(async () => {
      const res = await exportFullBackup()
      if (res.error || !res.sheets) {
        setError(res.error ?? 'No se pudo generar la copia.')
        return
      }
      const stamp = new Date().toISOString().slice(0, 10)
      await exportWorkbook(`itara-backup-${stamp}`, res.sheets)
      setDoneAt(new Date().toLocaleString('es-AR'))
    })
  }

  return (
    <div className="mt-6 rounded-2xl border border-sand bg-white p-6">
      <div className="flex items-center gap-1.5 text-ink/40">
        <DatabaseBackup size={16} className="text-moss" />
        <p className="text-xs uppercase tracking-[0.2em]">Copia de seguridad</p>
        <InfoHint
          align="left"
          text="Descarga un único archivo Excel con todo: alumnos, planes, suscripciones, pagos, clases sueltas, asistencia, cancelaciones y créditos. Guardalo cada tanto en tu Drive o disco como respaldo aparte de Supabase."
        />
      </div>
      <button onClick={handleClick} disabled={isPending} className="btn-primary mt-4">
        <DatabaseBackup size={15} />
        {isPending ? 'Generando...' : 'Descargar copia (.xlsx)'}
      </button>
      {error && <p className="mt-2 text-sm text-clay">{error}</p>}
      {doneAt && <p className="mt-2 text-sm text-moss-dark">Copia descargada — {doneAt}</p>}
    </div>
  )
}
