import { createClient } from '@/lib/supabase/server'
import { formatARS } from '@/lib/currency'
import { PaymentRowActions } from './payment-row-actions'
import { ExportButton } from '../export-button'

function defaultRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

type SubRef = {
  student_id: string
  plans: { name: string } | null
} | null

export default async function CuotasPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; q?: string; plan?: string; anuladas?: string }>
}) {
  const sp = await searchParams
  const dflt = defaultRange()
  const from = sp.from || dflt.from
  const to = sp.to || dflt.to
  const q = (sp.q || '').trim().toLowerCase()
  const planFilter = (sp.plan || '').trim()
  const showVoided = sp.anuladas === '1'

  const supabase = await createClient()

  const [{ data: rowsData }, { data: profilesData }, { data: plansData }] = await Promise.all([
    supabase
      .from('payments')
      .select(
        'id, amount, paid_at, notes, voided_at, voided_reason, recorded_by, subscription_id, subscriptions(student_id, plans(name))'
      )
      .gte('paid_at', `${from}T00:00:00`)
      .lte('paid_at', `${to}T23:59:59`)
      .order('paid_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name'),
    supabase.from('plans').select('name').order('name'),
  ])

  const nameById = new Map((profilesData ?? []).map((p) => [p.id, p.full_name]))
  const planNames = Array.from(new Set((plansData ?? []).map((p) => p.name)))

  let rows = (rowsData ?? []).map((r) => {
    const sub = r.subscriptions as unknown as SubRef
    return {
      id: r.id,
      amount: Number(r.amount),
      paidAt: r.paid_at as string,
      notes: (r.notes as string | null) ?? '',
      voidedAt: r.voided_at as string | null,
      voidedReason: (r.voided_reason as string | null) ?? '',
      studentName: sub?.student_id ? nameById.get(sub.student_id) ?? 'Alumno' : 'Alumno',
      planName: sub?.plans?.name ?? '—',
      recordedByName: r.recorded_by ? nameById.get(r.recorded_by as string) ?? '—' : '—',
    }
  })

  if (!showVoided) rows = rows.filter((r) => !r.voidedAt)
  if (q) rows = rows.filter((r) => r.studentName.toLowerCase().includes(q))
  if (planFilter) rows = rows.filter((r) => r.planName === planFilter)

  const total = rows.filter((r) => !r.voidedAt).reduce((s, r) => s + r.amount, 0)

  const exportRows = rows.map((r) => ({
    Fecha: new Date(r.paidAt).toLocaleDateString('es-AR'),
    Alumno: r.studentName,
    Plan: r.planName,
    Monto: r.voidedAt ? 0 : r.amount,
    Nota: r.notes,
    Registró: r.recordedByName,
    Estado: r.voidedAt ? `Anulado: ${r.voidedReason}` : 'OK',
  }))

  return (
    <div className="space-y-5">
      <form method="GET" className="flex flex-wrap items-end gap-3">
        <label className="text-xs text-ink/50">
          Desde
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 block rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
        </label>
        <label className="text-xs text-ink/50">
          Hasta
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 block rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
        </label>
        <label className="text-xs text-ink/50">
          Alumno
          <input
            type="text"
            name="q"
            defaultValue={sp.q ?? ''}
            placeholder="Buscar por nombre"
            className="mt-1 block rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          />
        </label>
        <label className="text-xs text-ink/50">
          Plan
          <select
            name="plan"
            defaultValue={planFilter}
            className="mt-1 block rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          >
            <option value="">Todos</option>
            {planNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-xs text-ink/50">
          <input type="checkbox" name="anuladas" value="1" defaultChecked={showVoided} />
          Ver anuladas
        </label>
        <button
          type="submit"
          className="btn-primary-sm"
        >
          Filtrar
        </button>
      </form>

      <div className="flex items-center justify-between">
        <p className="text-sm text-ink/60">
          {rows.length} {rows.length === 1 ? 'movimiento' : 'movimientos'} ·{' '}
          <span className="font-medium text-ink">{formatARS(total)}</span>
        </p>
        <ExportButton
          filename={`cuotas-${from}_a_${to}`}
          sheetName="Cuotas"
          title={`Cuotas ${from} a ${to}`}
          rows={exportRows}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-sand bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink/40">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Alumno</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium text-right">Monto</th>
              <th className="px-4 py-3 font-medium">Nota</th>
              <th className="px-4 py-3 font-medium">Registró</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink/40">
                  Sin movimientos en este período.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr
                key={r.id}
                className={`border-b border-sand/50 last:border-0 ${r.voidedAt ? 'text-ink/35' : 'text-ink/80'}`}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  {new Date(r.paidAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </td>
                <td className="px-4 py-3">{r.studentName}</td>
                <td className="px-4 py-3">{r.planName}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right ${r.voidedAt ? 'line-through' : ''}`}>
                  {formatARS(r.amount)}
                </td>
                <td className="px-4 py-3">
                  {r.voidedAt ? (
                    <span className="text-xs italic text-clay">Anulado — {r.voidedReason}</span>
                  ) : (
                    <span className="text-xs">{r.notes}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs">{r.recordedByName}</td>
                <td className="px-4 py-3 text-right">
                  {!r.voidedAt && (
                    <PaymentRowActions paymentId={r.id} amount={r.amount} notes={r.notes} paidAt={r.paidAt} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
