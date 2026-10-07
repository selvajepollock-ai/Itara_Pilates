import { createClient } from '@/lib/supabase/server'
import { BackLink } from '@/app/components/back-link'
import { TiposView } from './tipos-view'

export default async function TiposDeClasePage() {
  const supabase = await createClient()
  const [{ data: classTypes }, { data: classes }] = await Promise.all([
    supabase.from('class_types').select('id, name, description, active').order('active', { ascending: false }).order('name'),
    supabase.from('classes').select('class_type_id, instructor_id').eq('active', true),
  ])

  const classCount = new Map<string, number>()
  const instructors = new Map<string, Set<string>>()
  for (const c of classes ?? []) {
    const id = c.class_type_id as string
    classCount.set(id, (classCount.get(id) ?? 0) + 1)
    if (c.instructor_id) {
      const set = instructors.get(id) ?? new Set<string>()
      set.add(c.instructor_id as string)
      instructors.set(id, set)
    }
  }

  return (
    <div className="max-w-3xl pb-[120px] lg:pb-0">
      <BackLink href="/admin/horarios" label="Horarios" />
      <h1 className="font-display text-[30px] font-normal italic leading-tight text-ink lg:text-[38px]">Tipos de clase</h1>
      <div className="mt-3">
        <TiposView
          types={(classTypes ?? []).map((t) => ({
            id: t.id as string,
            name: t.name as string,
            description: (t.description as string | null) ?? null,
            active: t.active !== false,
            classCount: classCount.get(t.id as string) ?? 0,
            instructorCount: instructors.get(t.id as string)?.size ?? 0,
          }))}
        />
      </div>
    </div>
  )
}
