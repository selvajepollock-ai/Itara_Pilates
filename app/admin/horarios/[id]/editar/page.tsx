import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClassForm } from '../../class-form'
import { updateClass } from '../../actions'

export default async function EditarClasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: classItem }, { data: classTypes }, { data: instructors }] = await Promise.all([
    supabase
      .from('classes')
      .select('id, class_type_id, instructor_id, room, day_of_week, start_time, end_time, capacity')
      .eq('id', id)
      .single(),
    supabase.from('class_types').select('id, name').eq('active', true).order('name'),
    supabase.from('profiles').select('id, full_name').contains('roles', ['instructor']),
  ])

  if (!classItem) notFound()

  const updateWithId = updateClass.bind(null, id)

  return (
    <div className="max-w-md">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Horarios</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Editar clase</h1>

      <ClassForm
        classTypes={classTypes ?? []}
        instructors={instructors ?? []}
        initialValues={{
          class_type_id: classItem.class_type_id,
          instructor_id: classItem.instructor_id ?? '',
          room: classItem.room,
          day_of_week: classItem.day_of_week,
          start_time: classItem.start_time?.slice(0, 5),
          end_time: classItem.end_time?.slice(0, 5),
          capacity: classItem.capacity,
        }}
        submitLabel="Guardar cambios"
        action={updateWithId}
      />
    </div>
  )
}
