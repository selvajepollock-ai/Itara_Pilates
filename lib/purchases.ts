/** Una compra de clases sueltas puede tener varias clases (cargos). Se cobra, o se bonifica, de una vez. */
export type ChargeRow = {
  id: string
  student_id: string
  batch_id?: string | null
  amount: number | string
  description?: string | null
  created_at?: string
  paid?: boolean
  comp?: boolean
  paid_at?: string | null
}

export type Purchase = {
  key: string
  studentId: string
  ids: string[]
  total: number
  count: number
  rows: ChargeRow[]
}

/** Agrupa los cargos por compra (batch_id). Los cargos viejos, sin batch_id, cuentan como una compra cada uno. */
export function groupPurchases(rows: ChargeRow[]): Purchase[] {
  const map = new Map<string, Purchase>()
  for (const r of rows) {
    const key = r.batch_id ? `b:${r.batch_id}` : `c:${r.id}`
    const cur = map.get(key) ?? { key, studentId: r.student_id, ids: [], total: 0, count: 0, rows: [] }
    cur.ids.push(r.id)
    cur.total += Number(r.amount)
    cur.count += 1
    cur.rows.push(r)
    map.set(key, cur)
  }
  return [...map.values()]
}

/** Fecha de la clase, si está en la descripción ("Clase suelta (3) — 2026-10-08"). */
export function dateFromDescription(description: string | null | undefined) {
  const m = description?.match(/(\d{4}-\d{2}-\d{2})\s*$/)
  return m ? m[1] : null
}
