import { createClient } from '@/lib/supabase/server'
import { NewPlanForm } from './new-plan-form'
import { PlanRow } from './plan-row'

export default async function PlanesPage() {
  const supabase = await createClient()
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, price, active')
    .order('active', { ascending: false })
    .order('price')

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Planes</h1>
      <p className="mt-2 text-sm text-ink/60">Los tipos de mensualidad que ofrece el estudio.</p>

      <ul className="mt-8 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
        {plans?.map((p) => (
          <PlanRow key={p.id} plan={p} />
        ))}
        {(!plans || plans.length === 0) && (
          <li className="px-5 py-10 text-center text-sm text-ink/40">
            Todavía no hay planes cargados.
          </li>
        )}
      </ul>

      <NewPlanForm />
    </div>
  )
}
