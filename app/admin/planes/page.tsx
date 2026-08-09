import { createClient } from '@/lib/supabase/server'
import { NewPlanForm } from './new-plan-form'
import { PlanCard } from './plan-card'

export default async function PlanesPage() {
  const supabase = await createClient()
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, price, active, category, classes_per_week')
    .order('active', { ascending: false })
    .order('price')

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Planes</h1>
      <p className="mt-2 text-sm text-ink/60">Los tipos de mensualidad que ofrece el estudio.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans?.map((p) => (
          <PlanCard key={p.id} plan={p} />
        ))}
        {(!plans || plans.length === 0) && (
          <p className="col-span-full py-10 text-center text-sm text-ink/40">
            Todavía no hay planes cargados.
          </p>
        )}
      </div>

      <div className="mt-6 max-w-2xl">
        <NewPlanForm />
      </div>
    </div>
  )
}
