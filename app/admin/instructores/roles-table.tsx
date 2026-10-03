'use client'

import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'

const KEY = 'itara-roles-table-open'

// Permisos reales: /admin exige el rol admin; el panel instructor deja entrar a instructores y admins,
// y el instructor solo ve y marca asistencia en sus propias clases.
const ROWS: { label: string; admin: boolean; instructor: boolean }[] = [
  { label: 'Su agenda y marcar asistencia', admin: true, instructor: true },
  { label: 'Todos los horarios y alumnos', admin: true, instructor: false },
  { label: 'Pagos y liquidación', admin: true, instructor: false },
  { label: 'Reportes', admin: true, instructor: false },
  { label: 'Comunicados', admin: true, instructor: false },
  { label: 'Planes y equipo', admin: true, instructor: false },
]

const Yes = () => <span className="font-medium text-state-ok-ink">✓ Sí</span>
const No = () => <span className="text-muted">—</span>

/** "¿Qué puede hacer cada rol?": abierta la primera vez, después recuerda lo que elegiste. */
export function RolesTable() {
  const [open, setOpen] = useState(true)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved !== null) setOpen(saved === '1')
    } catch {
      // sin almacenamiento: queda abierta
    }
  }, [])

  function toggle() {
    const next = !open
    setOpen(next)
    try {
      localStorage.setItem(KEY, next ? '1' : '0')
    } catch {
      // ignorar
    }
  }

  return (
    <section className="mt-10">
      <button
        type="button"
        aria-expanded={open}
        onClick={toggle}
        className="flex min-h-[44px] items-center gap-2 font-display text-[22px] italic text-ink"
      >
        <ChevronDown size={18} className={`text-muted transition ${open ? 'rotate-180' : ''}`} aria-hidden />
        ¿Qué puede hacer cada rol?
      </button>

      {open && (
        <>
          {/* Escritorio: tabla */}
          <div className="surface-card mt-3 hidden lg:block">
            <div className="grid grid-cols-[minmax(0,2fr)_1fr_1fr] gap-3 rounded-t-[16px] bg-edge-head px-5 py-3 text-xs font-semibold text-muted">
              <span>Acceso</span>
              <span>Administrador</span>
              <span>Instructor</span>
            </div>
            {ROWS.map((r) => (
              <div key={r.label} className="grid grid-cols-[minmax(0,2fr)_1fr_1fr] gap-3 border-t border-edge-row px-5 py-3 text-sm">
                <span className="text-ink">{r.label}</span>
                <span>{r.admin ? <Yes /> : <No />}</span>
                <span>{r.instructor ? <Yes /> : <No />}</span>
              </div>
            ))}
          </div>

          {/* Celular: lista por rol */}
          <div className="mt-3 space-y-3 lg:hidden">
            {(
              [
                ['Administrador', 'admin'],
                ['Instructor', 'instructor'],
              ] as const
            ).map(([title, key]) => (
              <div key={key} className="surface-card p-4">
                <p className="text-sm font-semibold text-ink">{title}</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {ROWS.map((r) => (
                    <li key={r.label} className="flex justify-between gap-3">
                      <span className="text-ink">{r.label}</span>
                      {r[key] ? <Yes /> : <No />}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[13px] text-muted">
            Un administrador que también da clases lleva la etiqueta &quot;Instructor&quot; y aparece en la agenda.
          </p>
        </>
      )}
    </section>
  )
}
