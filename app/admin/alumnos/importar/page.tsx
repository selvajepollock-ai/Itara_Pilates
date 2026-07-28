'use client'

import { useState } from 'react'
import { createStudentsBatch, enrollBatch } from './actions'

type Row = { full_name: string; day_of_week: string; start_time: string; class_type: string }

function parseCSV(text: string): Row[] {
  const lines = text.trim().split('\n')
  const rows: Row[] = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    const [full_name, day_of_week, start_time, class_type] = line.split(',')
    rows.push({ full_name: full_name.trim(), day_of_week: day_of_week.trim(), start_time: start_time.trim(), class_type: class_type.trim() })
  }
  return rows
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

export default function ImportarAlumnosPage() {
  const [file, setFile] = useState<File | null>(null)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)

  function addLog(msg: string) {
    setLog((l) => [...l, msg])
  }

  async function handleImport() {
    if (!file) return
    setRunning(true)
    setLog([])
    setProgress(0)

    const text = await file.text()
    const rows = parseCSV(text)
    const uniqueNames = Array.from(new Set(rows.map((r) => r.full_name)))

    setTotal(uniqueNames.length + rows.length)
    addLog(`Encontrados: ${uniqueNames.length} alumnos únicos, ${rows.length} inscripciones.`)

    // Fase 1: crear/reutilizar alumnos en lotes de 15
    const nameToId: Record<string, string> = {}
    const nameBatches = chunk(uniqueNames, 15)
    let done = 0
    for (const batch of nameBatches) {
      const res = await createStudentsBatch(batch)
      if ('error' in res && res.error) {
        addLog(`Error creando lote: ${res.error}`)
      } else if ('result' in res) {
        Object.assign(nameToId, res.result)
      }
      done += batch.length
      setProgress(done)
    }
    addLog(`✓ Alumnos creados/reutilizados: ${Object.keys(nameToId).length}/${uniqueNames.length}`)

    // Fase 2: inscribir en lotes de 40
    const enrollRows = rows
      .filter((r) => nameToId[r.full_name])
      .map((r) => ({
        studentId: nameToId[r.full_name],
        classKey: `${r.class_type}_${r.day_of_week}_${r.start_time}`,
      }))

    const enrollBatches = chunk(enrollRows, 40)
    let insertedTotal = 0
    const notFoundSet = new Set<string>()

    for (const batch of enrollBatches) {
      const res = await enrollBatch(batch)
      if ('error' in res && res.error) {
        addLog(`Error en lote de inscripción: ${res.error}`)
      }
      if ('inserted' in res) insertedTotal += res.inserted ?? 0
      if ('notFound' in res && res.notFound) {
        res.notFound.forEach((k) => notFoundSet.add(k))
      }
      done += batch.length
      setProgress(done)
    }

    addLog(`✓ Inscripciones creadas: ${insertedTotal}/${enrollRows.length}`)
    if (notFoundSet.size > 0) {
      addLog(`⚠ No se encontró clase activa para: ${Array.from(notFoundSet).join(' | ')}`)
    }
    addLog('Listo.')
    setRunning(false)
  }

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Alumnos</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Importación masiva</h1>
      <p className="mt-2 text-sm text-ink/60">
        Subí el CSV con columnas: <code>full_name,day_of_week,start_time,class_type</code>. Crea
        los alumnos que falten (sin acceso al portal) y los anota en sus clases.
      </p>

      <div className="mt-6 rounded-2xl border border-sand bg-white p-6">
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-ink"
        />
        <button
          onClick={handleImport}
          disabled={!file || running}
          className="mt-4 w-full rounded-full bg-moss px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {running ? `Importando... (${progress}/${total})` : 'Iniciar importación'}
        </button>

        {total > 0 && (
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-linen">
            <div
              className="h-full rounded-full bg-moss transition-all"
              style={{ width: `${Math.min((progress / total) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      {log.length > 0 && (
        <div className="mt-6 rounded-2xl border border-sand bg-white p-6">
          <p className="text-xs uppercase tracking-wide text-ink/40">Registro</p>
          <ul className="mt-2 space-y-1 text-sm text-ink/70">
            {log.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
