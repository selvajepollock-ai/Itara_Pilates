import { createClient } from '@/lib/supabase/server'
import { MarkChargePaidButton } from './mark-charge-paid-button'

function formatARS(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export async function ExtraChargesSection({ studentId }: { studentId: string }) {
  const supabase = await createClient()
  const { data: charges } = await supabase
    .from('extra_charges')
    .select('id, description, amount, paid, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })

  const pending = (charges ?? []).filter((c) => !c.paid)
  if (pending.length === 0) return null

  const total = pending.reduce((sum, c) => sum + Number(c.amount), 0)

  return (
    <div className="rounded-2xl border border-clay/30 bg-clay/5 p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink">Cargos extra pendientes</p>
        <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-medium text-clay">
          {formatARS(total)}
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {pending.map((c) => (
          <li key={c.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="text-ink/80">{c.description}</p>
              <p className="text-xs text-ink/40">
                {new Date(c.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-medium text-clay">{formatARS(Number(c.amount))}</span>
              <MarkChargePaidButton chargeId={c.id} studentId={studentId} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
