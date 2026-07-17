import Link from 'next/link'

export default function AdminDashboard() {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Hoy</p>
      <h1 className="mt-2 font-display text-4xl italic text-ink">Bienvenida al estudio</h1>
      <p className="mt-3 max-w-md text-sm text-ink/60">
        Desde acá gestionás horarios, alumnos, cuotas y reportes del estudio.
      </p>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Link
          href="/admin/alumnos"
          className="rounded-2xl border border-sand bg-white p-6 transition hover:border-moss hover:shadow-[0_2px_20px_rgba(46,43,38,0.06)]"
        >
          <p className="font-display text-xl italic text-ink">Alumnos</p>
          <p className="mt-1 text-sm text-ink/60">Alta, contacto e historial.</p>
        </Link>
        <Link
          href="/admin/horarios"
          className="rounded-2xl border border-sand bg-white p-6 transition hover:border-moss hover:shadow-[0_2px_20px_rgba(46,43,38,0.06)]"
        >
          <p className="font-display text-xl italic text-ink">Horarios</p>
          <p className="mt-1 text-sm text-ink/60">Clases, instructores y salas.</p>
        </Link>
      </div>
    </div>
  )
}
