import Link from 'next/link'
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
        </div>
        <Link
          href="/admin/alumnos/nuevo"
          className="rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark"
        >
          + Nuevo alumno
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-sand bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-sand text-left text-xs uppercase tracking-wide text-ink/50">
              <th className="px-5 py-3 font-medium">Nombre</th>
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">Teléfono</th>
              <th className="px-5 py-3 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {students?.map((s) => (
              <tr key={s.id} className="border-b border-sand/60 last:border-0">
                <td className="px-5 py-3 text-ink">{s.full_name}</td>
                <td className="px-5 py-3 text-ink/70">{s.email}</td>
                <td className="px-5 py-3 text-ink/70">{s.phone ?? '—'}</td>
                <td className="px-5 py-3">
                  {s.active ? (
                    <span className="rounded-full bg-moss/10 px-2.5 py-1 text-xs font-medium text-moss-dark">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-full bg-sand px-2.5 py-1 text-xs font-medium text-ink/50">
                      Inactivo
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {(!students || students.length === 0) && (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-sm text-ink/40">
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
