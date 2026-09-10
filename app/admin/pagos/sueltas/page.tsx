import { createClient } from '@/lib/supabase/server'
import { formatARS } from '@/lib/currency'
import { ChargePaidToggle } from './charge-paid-toggle'
import { ExportButton } from '../export-button'

function defaultRange() {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export default async function ClasesSueltasPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; q?: string; estado?: string }>
}) {
  const sp = await searchParams
  const dflt = defaultRange()
  const from = sp.from || dflt.from
  const to = sp.to || dflt.to
  const q = (sp.q || '').trim().toLowerCase()
  const estado = sp.estado || 'todas'

  const supabase = await createClient()
  const { data: rowsData } = await supabase
    .from('extra_charges')
    .select('id, description, amount, paid, paid_at, comp, created_at, profiles(full_name)')
    .gte('created_at', `${from}T00:00:00`)
    .lte('created_at', `${to}T23:59:59`)
    .order('created_at', { ascending: false })

  let rows = (rowsData ?? []).map((r) => ({
    id: r.id,
    description: (r.description as string) ?? 'Clase extra',
    amount: Number(r.amount),
    paid: Boolean(r.paid),
    comp: Boolean(r.comp),
    paidAt: r.paid_at as string | null,
    createdAt: r.created_at as string,
    studentName:
      (r.profiles as unknown as { full_name: string } | null)?.full_name ?? 'Alumno',
  }))

  const estadoLabel = (r: { paid: boolean; comp: boolean }) =>
    r.comp ? 'Bonificada' : r.paid ? 'Pagado' : 'Pendiente'

  if (q) rows = rows.filter((r) => r.studentName.toLowerCase().includes(q))
  if (estado === 'pendientes') rows = rows.filter((r) => !r.paid && !r.comp)
  if (estado === 'pagadas') rows = rows.filter((r) => r.paid)
  if (estado === 'bonificadas') rows = rows.filter((r) => r.comp)

  const totalPaid = rows.filter((r) => r.paid).reduce((s, r) => s + r.amount, 0)
  const totalPending = rows.filter((r) => !r.paid && !r.comp).reduce((s, r) => s + r.amount, 0)

  const exportRows = rows.map((r) => ({
    'Fecha cargo': new Date(r.createdAt).toLocaleDateString('es-AR'),
    Alumno: r.studentName,
    Concepto: r.description,
    Monto: r.comp ? 0 : r.amount,
    Estado: estadoLabel(r),
    'Fecha pago': r.paidAt ? new Date(r.paidAt).toLocaleDateString('es-AR') : '',
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
          Estado
          <select
            name="estado"
            defaultValue={estado}
            className="mt-1 block rounded-lg border border-sand bg-white px-3 py-2 text-sm text-ink outline-none focus:border-moss"
          >
            <option value="todas">Todas</option>
            <option value="pendientes">Pendientes</option>
            <option value="pagadas">Pagadas</option>
            <option value="bonificadas">Bonificadas</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-full bg-moss px-5 py-2 text-xs font-medium text-white hover:bg-moss-dark"
        >
          Filtrar
        </button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/60">
          Pagado <span className="font-medium text-moss-dark">{formatARS(totalPaid)}</span> · Pendiente{' '}
          <span className="font-medium text-clay">{formatARS(totalPending)}</span>
          {rows.some((r) => r.comp) && (
            <>
              {' '}
              · <span className="text-ink/40">{rows.filter((r) => r.comp).length} bonificada(s)</span>
            </>
          )}
        </p>
        <ExportButton
          filename={`clases-sueltas-${from}_a_${to}`}
          sheetName="Clases sueltas"
          title={`Clases sueltas ${from} a ${to}`}
          rows={exportRows}
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-sand bg-white">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink/40">
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Alumno</th>
              <th className="px-4 py-3 font-medium">Concepto</th>
              <th className="px-4 py-3 font-medium text-right">Monto</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-ink/40">
                  Sin clases sueltas en este período.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-sand/50 text-ink/80 last:border-0">
                <td className="whitespace-nowrap px-4 py-3">
                  {new Date(r.createdAt).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                </td>
                <td className="px-4 py-3">{r.studentName}</td>
                <td className="px-4 py-3">{r.description}</td>
                <td className={`whitespace-nowrap px-4 py-3 text-right ${r.comp ? 'text-ink/35 line-through' : ''}`}>
                  {formatARS(r.amount)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      r.comp
                        ? 'bg-blush text-ink/70'
                        : r.paid
                          ? 'bg-moss/10 text-moss-dark'
                          : 'bg-clay/10 text-clay'
                    }`}
                  >
                    {estadoLabel(r)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <ChargePaidToggle chargeId={r.id} paid={r.paid} comp={r.comp} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
