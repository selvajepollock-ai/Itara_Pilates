import { createClient } from '@/lib/supabase/server'
import { NewClassTypeForm } from './new-class-type-form'
import { ClassTypeRow } from './class-type-row'

export default async function TiposDeClasePage() {
  const supabase = await createClient()
  const { data: classTypes } = await supabase
    .from('class_types')
    .select('id, name, description, active')
    .order('active', { ascending: false })
    .order('name')

  return (
    <div className="max-w-lg">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Horarios</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Tipos de clase</h1>
      <p className="mt-2 text-sm text-ink/60">Ej: Mat, Reformer. Se usan al crear un horario.</p>

      <ul className="mt-8 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
        {classTypes?.map((ct) => (
          <ClassTypeRow key={ct.id} classType={ct} />
        ))}
        {(!classTypes || classTypes.length === 0) && (
          <li className="px-5 py-10 text-center text-sm text-ink/40">
            Todavía no hay tipos de clase.
          </li>
        )}
      </ul>

      <NewClassTypeForm />
    </div>
  )
}
