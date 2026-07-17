import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function InstructoresPage() {
  const supabase = await createClient()
  const { data: instructors, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, phone, roles, active, created_at')
    .contains('roles', ['instructor'])
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Instructores</h1>
          <p className="mt-1 text-sm text-ink/50">{instructors?.length ?? 0} en el equipo</p>
          {error && <p className="mt-1 text-sm text-clay">Error: {error.message}</p>}
        </div>
        <Link
          href="/admin/instructores/nuevo"
          className="flex items-center gap-1.5 rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo instructor
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink/40">
              <th className="px-5 py-3.5 font-medium">Nombre</th>
              <th className="px-5 py-3.5 font-medium">Usuario</th>
              <th className="px-5 py-3.5 font-medium">Teléfono</th>
              <th className="px-5 py-3.5 font-medium">Rol</th>
              <th className="px-5 py-3.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {instructors?.map((i) => (
              <tr key={i.id} className="border-b border-sand/60 transition last:border-0 hover:bg-linen/50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-moss/10 text-xs font-medium text-moss-dark">
                      {i.full_name?.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-ink">{i.full_name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-ink/60">{i.username ?? '—'}</td>
                <td className="px-5 py-3.5 text-ink/60">{i.phone ?? '—'}</td>
                <td className="px-5 py-3.5">
                  {i.roles?.includes('admin') ? (
                    <span className="rounded-full bg-clay/10 px-2.5 py-1 text-xs font-medium text-clay">
                      Instructor + Admin
                    </span>
                  ) : (
                    <span className="rounded-full bg-moss/10 px-2.5 py-1 text-xs font-medium text-moss-dark">
                      Instructor
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/admin/instructores/${i.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-moss hover:text-moss-dark"
                  >
                    <Pencil size={13} strokeWidth={2} />
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {(!instructors || instructors.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-sm text-ink/40">
                  Todavía no hay instructores cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
