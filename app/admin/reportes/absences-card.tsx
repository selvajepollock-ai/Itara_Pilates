'use client'

import { useEffect, useState } from 'react'
import { Avatar } from '@/app/components/avatar'
import { StudentDrawer } from '../alumnos/student-drawer'
import type { StudentRow } from '../alumnos/types'

export type AbsenceItem = { studentId: string; name: string; count: number }

function useIsMobile() {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setMobile(mq.matches)
    const on = () => setMobile(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return mobile
}

/** Ausentismo: título + lista a la izquierda, nota explicativa a la derecha. El nombre abre la ficha del alumno. */
export function AbsencesCard({
  items,
  students,
  dueDay,
}: {
  items: AbsenceItem[]
  students: StudentRow[]
  dueDay: number
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const isMobile = useIsMobile()
  const student = openId ? students.find((s) => s.id === openId) ?? null : null

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
                <button
                  type="button"
                  onClick={() => setOpenId(a.studentId)}
                  className="min-w-0 flex-1 truncate text-left text-sm font-medium text-ink hover:text-moss hover:underline"
                >
                  {a.name}
                </button>
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

      {student && (
        <StudentDrawer
          student={student}
          dueDay={dueDay}
          isMobile={isMobile}
          onClose={() => setOpenId(null)}
          fullHref={`/admin/alumnos?alumno=${student.id}`}
        />
      )}
    </section>
  )
}
