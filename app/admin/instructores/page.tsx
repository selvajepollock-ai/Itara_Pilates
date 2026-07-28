import Link from 'next/link'
import { Plus, ShieldCheck, GraduationCap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DeleteTeamMemberButton } from './delete-team-member-button'

type Person = {
  id: string
  full_name: string
  username: string | null
  phone: string | null
  roles: string[]
}

function PersonRow({ person }: { person: Person }) {
  return (
    <li key={person.id} className="flex items-center justify-between px-5 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-medium text-ink">
          {person.full_name?.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-sm text-ink">{person.full_name}</p>
          <p className="text-xs text-ink/40">{person.username ?? '—'}</p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {person.phone && <span className="text-xs text-ink/40">{person.phone}</span>}
        <Link
          href={`/admin/instructores/${person.id}`}
          className="text-xs font-medium text-moss hover:text-moss-dark"
        >
          Editar
        </Link>
        <DeleteTeamMemberButton personId={person.id} fullName={person.full_name} />
      </div>
    </li>
  )
}

export default async function EquipoPage() {
  const supabase = await createClient()
  const { data: people } = await supabase
    .from('profiles')
    .select('id, full_name, username, phone, roles')
    .or('roles.cs.{admin},roles.cs.{instructor}')
    .order('full_name')

  const admins = (people ?? []).filter((p) => p.roles?.includes('admin')) as Person[]
  const pureInstructors = (people ?? []).filter(
    (p) => p.roles?.includes('instructor') && !p.roles?.includes('admin')
  ) as Person[]

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Equipo</h1>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/instructores/nuevo-admin"
            className="flex items-center gap-1.5 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:border-moss hover:text-moss"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo admin
          </Link>
          <Link
            href="/admin/instructores/nuevo"
            className="flex items-center gap-1.5 rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo instructor
          </Link>
        </div>
      </div>

      {/* Administradores */}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-moss" />
          <p className="text-sm font-medium text-ink">Administradores</p>
        </div>
        <p className="mt-0.5 text-xs text-ink/50">
          Acceso total: alumnos, pagos, reportes, horarios y configuración del estudio.
          {admins.some((a) => a.roles.includes('instructor')) &&
            ' Los que también dan clases tienen "+ Instructor" en su ficha.'}
        </p>
        <ul className="mt-3 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
          {admins.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
          {admins.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-ink/40">Sin administradores.</li>
          )}
        </ul>
      </div>

      {/* Instructores */}
      <div className="mt-8">
        <div className="flex items-center gap-2">
          <GraduationCap size={16} className="text-clay" />
          <p className="text-sm font-medium text-ink">Instructores</p>
        </div>
        <p className="mt-0.5 text-xs text-ink/50">
          Solo ven su agenda y pueden marcar asistencia — sin acceso a pagos, reportes ni datos de
          otros alumnos.
        </p>
        <ul className="mt-3 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
          {pureInstructors.map((p) => (
            <PersonRow key={p.id} person={p} />
          ))}
          {pureInstructors.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-ink/40">
              Todavía no hay instructores cargados.
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}
