import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buildReparto, COMMISSION_RATE } from '@/lib/reparto'
import { PageHeader } from '@/app/components/page-header'
import { todayART } from '../horarios/slots'
import { RolesTable } from './roles-table'
import { TeacherBar, UnassignedLink } from './teacher-bar'
import { AddMenu, TeamSection, type TeamPerson } from './team-view'

type Person = {
  id: string
  full_name: string
  username: string | null
  phone: string | null
  roles: string[]
}

export default async function EquipoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: people } = await supabase
    .from('profiles')
    .select('id, full_name, username, phone, roles')
    .or('roles.cs.{admin},roles.cs.{instructor}')
    .order('full_name')

  // Alumnos por profesor: el mismo cálculo (y los mismos números) que Liquidación, del mes actual.
  const reparto = await buildReparto(supabase, todayART().slice(0, 7))
  const groupByKey = new Map(reparto.groups.map((g) => [g.key, g]))
  const pct = Math.round(COMMISSION_RATE * 100)

  const toPerson = (p: Person): TeamPerson => {
    const isAdmin = p.roles?.includes('admin') ?? false
    const isInstructor = p.roles?.includes('instructor') ?? false
    const group = groupByKey.get(p.id)
    let extra = ''
    if (isAdmin && isInstructor) extra = 'Dueño · sin comisión'
    else if (isInstructor) extra = `Comisión ${pct}%`
    // TODO: "Registra pagos" para administradores: no hay un dato directo para mostrarlo.
    return {
      id: p.id,
      fullName: p.full_name,
      username: p.username,
      phone: p.phone,
      isAdmin,
      isInstructor,
      students: isInstructor ? group?.students.length ?? 0 : null,
      extra,
    }
  }

  const admins = ((people ?? []) as Person[])
    .filter((p) => p.roles?.includes('admin') && !p.roles?.includes('developer'))
    .map(toPerson)
  const instructors = ((people ?? []) as Person[])
    .filter((p) => p.roles?.includes('instructor') && !p.roles?.includes('admin'))
    .map(toPerson)

  const slices = reparto.groups
    .filter((g) => g.key !== 'none' && g.students.length > 0)
    .map((g) => ({ key: g.key, name: g.name, students: g.students.length }))

  return (
    <div>
      <div>
        <PageHeader
          title="Equipo"
          actions={
            <>
              <AddMenu />
              <Link href="/admin/instructores/nuevo-admin" className="btn-secondary hidden lg:inline-flex">
                <Plus size={16} strokeWidth={2.5} />
                Nuevo administrador
              </Link>
              <Link href="/admin/instructores/nuevo" className="btn-primary hidden lg:inline-flex">
                <Plus size={16} strokeWidth={2.5} />
                Nuevo instructor
              </Link>
            </>
          }
        />
        <p className="mt-2 text-sm text-muted">Quiénes trabajan en el estudio y qué puede ver cada uno.</p>
      </div>

      <section className="surface-card mt-6 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-[22px] font-normal italic leading-tight text-ink">Alumnos por profesor</h2>
          <UnassignedLink count={reparto.withoutInstructor} />
        </div>
        <TeacherBar slices={slices} withoutInstructor={reparto.withoutInstructor} />
      </section>

      <TeamSection
        title="Administradores"
        description="Acceso total: alumnos, pagos, reportes, horarios y configuración del estudio."
        people={admins}
        currentUserId={user?.id ?? ''}
        emptyText="Sin administradores."
      />
      <TeamSection
        title="Instructores"
        description="Solo ven su agenda y pueden marcar asistencia, sin acceso a pagos, reportes ni datos de otros alumnos."
        people={instructors}
        currentUserId={user?.id ?? ''}
        emptyText="Todavía no hay instructores cargados."
      />

      <RolesTable />
    </div>
  )
}
