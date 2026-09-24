import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatARS } from '@/lib/currency'
import { buildReparto, COMMISSION_RATE } from '@/lib/reparto'
import { ExportButton } from '../export-button'
import { PayoutForm } from './payout-form'

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default async function RepartoPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? '') ? (monthParam as string) : currentMonth()
  const supabase = await createClient()
  const reparto = await buildReparto(supabase, month)

  const monthName = new Date(`${month}-01T00:00:00`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const pct = Math.round(COMMISSION_RATE * 100)

  const exportRows: Record<string, string | number>[] = []
  for (const g of reparto.groups) {
    for (const s of g.students) {
      exportRows.push({
        Profesor: g.name,
        Alumno: s.name,
        Plan: s.planName,
        Asignado: s.assigned,
        Cobrado: s.collected,
        [`Comisión ${pct}% s/asignado`]: g.isOwner || g.key === 'none' ? 0 : Math.round(s.assigned * COMMISSION_RATE * 100) / 100,
        [`Comisión ${pct}% s/cobrado`]: g.isOwner || g.key === 'none' ? 0 : Math.round(s.collected * COMMISSION_RATE * 100) / 100,
      })
    }
    exportRows.push({
      Profesor: g.name,
      Alumno: 'TOTAL',
      Plan: '',
      Asignado: g.assigned,
      Cobrado: g.collected,
      [`Comisión ${pct}% s/asignado`]: g.commissionAssigned,
      [`Comisión ${pct}% s/cobrado`]: g.commissionCollected,
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink/50 first-letter:uppercase">{monthName}</p>
        <div className="flex flex-wrap items-center gap-3">
          <form action="/admin/pagos/reparto" method="GET">
            <input
              type="month"
              name="month"
              defaultValue={month}
              className="rounded-full border border-sand px-4 py-2 text-sm text-ink/70 outline-none focus:border-moss"
            />
          </form>
          <ExportButton filename={`reparto-${month}`} sheetName="Reparto" title={`Reparto ${month}`} rows={exportRows} />
        </div>
      </div>

      {reparto.withoutInstructor > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-clay/30 bg-clay/5 px-5 py-4 text-sm text-ink/70">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-clay" />
          <p>
            <span className="font-medium text-clay">
              {reparto.withoutInstructor} alumno{reparto.withoutInstructor === 1 ? '' : 's'} sin profesor asignado.
            </span>{' '}
            No suman a ningún profesor hasta que tengan horarios fijos.{' '}
            <Link href="/admin/alumnos" className="font-medium text-moss hover:text-moss-dark">
              Ir a Alumnos y filtrar "Sin profesor" →
            </Link>
          </p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Cobrado del mes" value={formatARS(reparto.totalCollected)} hint={`asignado: ${formatARS(reparto.totalAssigned)}`} />
        <Stat
          label="Para profesores"
          value={formatARS(reparto.groups.reduce((a, g) => a + g.commissionCollected, 0))}
          hint={`${pct}% s/cobrado de Yani y Fabi`}
        />
        <Stat label="Para el estudio" value={formatARS(reparto.studioCollected)} hint="Rodri y Vane · s/cobrado" highlight />
        <Stat label="Estudio s/asignado" value={formatARS(reparto.studioAssigned)} hint="si todos pagaran" />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-sand bg-white">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink/40">
              <th className="px-5 py-3.5 font-medium">Profesor</th>
              <th className="px-3 py-3.5 text-right font-medium">Alumnos</th>
              <th className="px-3 py-3.5 text-right font-medium">Asignado</th>
              <th className="px-3 py-3.5 text-right font-medium">Cobrado</th>
              <th className="px-3 py-3.5 text-right font-medium">Comisión s/asignado</th>
              <th className="px-3 py-3.5 text-right font-medium">Comisión s/cobrado</th>
              <th className="px-5 py-3.5 text-right font-medium">Pendiente</th>
            </tr>
          </thead>
          <tbody>
            {reparto.groups.map((g) => {
              const pays = g.key !== 'none' && !g.isOwner
              const pending = Math.max(g.commissionCollected - g.paid, 0)
              return (
                <tr key={g.key} className="border-b border-sand/60 last:border-0">
                  <td className="px-5 py-3.5 text-ink">
                    {g.name}
                    {g.isOwner && <span className="ml-2 rounded-full bg-linen px-2 py-0.5 text-[11px] text-ink/50">dueño</span>}
                  </td>
                  <td className="px-3 py-3.5 text-right text-ink/60">{g.students.length}</td>
                  <td className="px-3 py-3.5 text-right text-ink/70">{formatARS(g.assigned)}</td>
                  <td className="px-3 py-3.5 text-right font-medium text-ink">{formatARS(g.collected)}</td>
                  <td className="px-3 py-3.5 text-right text-ink/70">{pays ? formatARS(g.commissionAssigned) : '—'}</td>
                  <td className="px-3 py-3.5 text-right text-ink/70">{pays ? formatARS(g.commissionCollected) : '—'}</td>
                  <td className="px-5 py-3.5 text-right">
                    {pays ? (
                      <span className={pending > 0 ? 'font-medium text-clay' : 'text-moss-dark'}>
                        {pending > 0 ? formatARS(pending) : 'Al día'}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="-mt-3 text-xs text-ink/40">
        Comisión = {pct}% del valor. "Asignado" es el precio del plan más cargos extra del mes; "cobrado" es lo que
        efectivamente entró (por fecha de pago). Los bonificados no suman. A Rodri no se le calcula comisión.
        "Pendiente" es la comisión s/cobrado menos lo ya pagado.
      </p>

      {reparto.groups
        .filter((g) => g.students.length > 0 || g.payouts.length > 0)
        .map((g) => {
          const pays = g.key !== 'none' && !g.isOwner
          return (
            <details key={g.key} className="rounded-2xl border border-sand bg-white p-5" open={pays}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                <span className="section-title">
                  {g.name} · {g.students.length} alumno{g.students.length === 1 ? '' : 's'}
                </span>
                <span className="text-sm text-ink/60">
                  Cobrado {formatARS(g.collected)}
                  {pays && ` · a pagar ${formatARS(g.commissionCollected)}`}
                </span>
              </summary>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink/40">
                      <th className="py-2 pr-3 font-medium">Alumno</th>
                      <th className="px-3 py-2 font-medium">Plan</th>
                      <th className="px-3 py-2 text-right font-medium">Asignado</th>
                      <th className="px-3 py-2 text-right font-medium">Cobrado</th>
                      {pays && <th className="py-2 pl-3 text-right font-medium">Comisión s/cobrado</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {g.students.map((s) => (
                      <tr key={s.studentId} className="border-b border-sand/50 last:border-0 text-ink/70">
                        <td className="py-2 pr-3">
                          <Link href={`/admin/alumnos/${s.studentId}`} className="text-ink hover:text-moss">
                            {s.name}
                          </Link>
                        </td>
                        <td className="px-3 py-2">{s.comp ? 'Bonificado' : s.planName}</td>
                        <td className="px-3 py-2 text-right">{formatARS(s.assigned)}</td>
                        <td className="px-3 py-2 text-right">{formatARS(s.collected)}</td>
                        {pays && (
                          <td className="py-2 pl-3 text-right">{formatARS(Math.round(s.collected * COMMISSION_RATE * 100) / 100)}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {pays && (
                <PayoutForm
                  instructorId={g.key}
                  month={month}
                  suggested={Math.max(g.commissionCollected - g.paid, 0)}
                  payouts={g.payouts}
                />
              )}
            </details>
          )
        })}
    </div>
  )
}

function Stat({ label, value, hint, highlight }: { label: string; value: string; hint: string; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${highlight ? 'border-moss/40 bg-moss/5' : 'border-sand bg-white'}`}>
      <p className="text-xs uppercase tracking-[0.2em] text-ink/40">{label}</p>
      <p className="mt-3 font-display text-3xl italic text-ink">{value}</p>
      <p className="mt-1 text-xs text-ink/40">{hint}</p>
    </div>
  )
}
