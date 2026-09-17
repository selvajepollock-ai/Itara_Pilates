import { createClient } from '@/lib/supabase/server'
import { ClassForm } from '../class-form'
import { createClass } from '../actions'

export default async function NuevaClasePage() {
  const supabase = await createClient()

  const [{ data: classTypes }, { data: instructors }] = await Promise.all([
    supabase.from('class_types').select('id, name').eq('active', true).order('name'),
    supabase.from('profiles').select('id, full_name').contains('roles', ['instructor']),
  ])

  return (
    <div className="max-w-md">
      <p className="eyebrow">Horarios</p>
      <h1 className="page-title mt-2">Nueva clase</h1>
      <p className="mt-2 text-sm text-ink/60">Definí el día, horario, sala e instructor.</p>

      <ClassForm
        classTypes={classTypes ?? []}
        instructors={instructors ?? []}
        submitLabel="Crear clase"
        action={createClass}
      />
    </div>
  )
}
