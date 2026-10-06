import { createClient } from '@/lib/supabase/server'
import { formatARS } from '@/lib/currency'
import { dateFromDescription, groupPurchases, type ChargeRow } from '@/lib/purchases'
import { PurchaseActions } from '../../pagos/purchase-actions'
import { shortDate } from '../format'

/**
 * Clases sueltas del alumno, agrupadas por compra: lo pendiente de cobro (se cobra todo junto)
 * y las últimas compras ya pagadas.
 */
export async function ExtraChargesSection({ studentId }: { studentId: string }) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('extra_charges')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  const charges = (data ?? []) as unknown as ChargeRow[]
  const pending = groupPurchases(charges.filter((c) => !c.paid && !c.comp))
  const paid = groupPurchases(charges.filter((c) => c.paid)).slice(0, 3)
  if (pending.length === 0 && paid.length === 0) return null

  const classLine = (c: ChargeRow) => {
    const date = dateFromDescription(c.description)
    return `${date ? shortDate(date) : 'Clase suelta'} · ${formatARS(Number(c.amount))}`
  }

  return (
    <div className="space-y-3">
      {pending.map((p) => (
        <div key={p.key} className="rounded-2xl border border-clay/30 bg-clay/5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-ink">
                Clases sueltas por cobrar · {p.count} {p.count === 1 ? 'clase' : 'clases'}
              </p>
              <p className="mt-0.5 text-xs text-ink/50">Se cobran todas juntas.</p>
            </div>
            <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-semibold text-clay">{formatARS(p.total)}</span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-ink/70">
            {p.rows.map((c) => (
              <li key={c.id}>{classLine(c)}</li>
            ))}
          </ul>
          <div className="mt-4">
            <PurchaseActions ids={p.ids} count={p.count} total={formatARS(p.total)} />
          </div>
        </div>
      ))}

      {paid.length > 0 && (
        <div className="rounded-2xl border border-sand bg-white p-6">
          <p className="text-sm font-medium text-ink">Clases sueltas pagadas</p>
          <ul className="mt-3 space-y-2 text-sm">
            {paid.map((p) => (
              <li key={p.key} className="flex items-start justify-between gap-3">
                <span className="text-ink/70">
                  {p.count} {p.count === 1 ? 'clase' : 'clases'}
                  <span className="block text-xs text-ink/40">{p.rows.map((c) => classLine(c).split(' · ')[0]).join(', ')}</span>
                </span>
                <span className="font-medium text-ink">{formatARS(p.total)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
