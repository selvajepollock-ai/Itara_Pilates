'use client'

import Link from 'next/link'
import { Avatar } from '@/app/components/avatar'

export type AbsenceItem = { studentId: string; name: string; count: number }

/** Ausentismo: título + lista a la izquierda, nota explicativa a la derecha. El nombre lleva a la ficha del alumno. */
export function AbsencesCard({ items }: { items: AbsenceItem[] }) {
  return (
    <section id="ausentismo" className="surface-card grid gap-6 p-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <div>
        <h2 className="font-display text-[22px] font-normal italic leading-tight text-ink">Ausentismo</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Sin ausencias registradas en el período.</p>
        ) : (
          <ul className="mt-3">
            {items.map((a) => (
              <li key={a.studentId} className="flex min-h-[48px] items-center gap-3 border-t border-edge-row first:border-t-0">
                <Avatar name={a.name} size={30} />
                <Link
                  href={`/admin/alumnos/${a.studentId}`}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink hover:text-moss hover:underline"
                >
                  {a.name}
                </Link>
                <span className="shrink-0 rounded-full bg-slot-cancel px-2.5 py-0.5 text-xs font-semibold text-slot-cancel-ink">
                  {a.count} {a.count === 1 ? 'vez' : 'veces'}
                </span>
              </li>
            ))}
          </ul>
        )}
        {/* TODO: "última fecha" de cada ausencia: requiere leer la fecha de cada aviso/falta. */}
      </div>
      <p className="text-[13px] leading-relaxed text-muted">
        Tomar asistencia es opcional para los instructores, así que este número puede no reflejar todas las faltas.
        También cuenta los avisos de cancelación tardíos.
      </p>
    </section>
  )
}
