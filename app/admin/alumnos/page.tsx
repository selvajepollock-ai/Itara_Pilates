import Link from 'next/link'
import { Plus, Pencil } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export default async function AlumnosPage() {
  const supabase = await createClient()
  const { data: students } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, active, created_at')
    .contains('roles', ['student'])
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Alumnos</h1>
          <p className="mt-1 text-sm text-ink/50">{students?.length ?? 0} en total</p>
        </div>
        <Link
          href="/admin/alumnos/nuevo"
          className="flex items-center gap-1.5 rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo alumno
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink/40">
              <th className="px-5 py-3.5 font-medium">Nombre</th>
              <th className="px-5 py-3.5 font-medium">Email</th>
              <th className="px-5 py-3.5 font-medium">Teléfono</th>
              <th className="px-5 py-3.5 font-medium">Estado</th>
              <th className="px-5 py-3.5 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {students?.map((s) => (
              <tr key={s.id} className="border-b border-sand/60 transition last:border-0 hover:bg-linen/50">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-medium text-ink">
                      {s.full_name?.slice(0, 1).toUpperCase()}
                    </div>
                    <span className="text-ink">{s.full_name}</span>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-ink/60">{s.email}</td>
                <td className="px-5 py-3.5 text-ink/60">{s.phone ?? '—'}</td>
                <td className="px-5 py-3.5">
                  {s.active ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-moss-dark">
                      <span className="h-1.5 w-1.5 rounded-full bg-moss" />
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ink/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink/20" />
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={`/admin/alumnos/${s.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-moss hover:text-moss-dark"
                  >
                    <Pencil size={13} strokeWidth={2} />
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
            {(!students || students.length === 0) && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center text-sm text-ink/40">
                  Todavía no hay alumnos cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
