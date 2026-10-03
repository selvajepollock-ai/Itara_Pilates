import Link from 'next/link'

export type TeacherSlice = { key: string; name: string; students: number }

const COLORS = ['bg-moss', 'bg-[#8DB0CE]', 'bg-state-none', 'bg-[#B58BC4]', 'bg-state-surcharge', 'bg-state-soon']

/** Barra segmentada de alumnos por profesor (los mismos números que Liquidación) y su leyenda. */
export function TeacherBar({ slices, withoutInstructor }: { slices: TeacherSlice[]; withoutInstructor: number }) {
  const total = slices.reduce((s, x) => s + x.students, 0) + withoutInstructor
  if (total === 0) return <p className="mt-3 text-sm text-muted">Todavía no hay alumnos con clases asignadas.</p>

  return (
    <div>
      <div className="mt-4 flex h-3.5 gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Alumnos por profesor">
        {slices.map((s, i) =>
          s.students > 0 ? (
            <div
              key={s.key}
              title={`${s.name}: ${s.students}`}
              className={COLORS[i % COLORS.length]}
              style={{ flexGrow: s.students, flexBasis: 0 }}
            />
          ) : null
        )}
        {withoutInstructor > 0 && (
          <div title={`Sin profesor: ${withoutInstructor}`} className="bg-[#D9D3C8]" style={{ flexGrow: withoutInstructor, flexBasis: 0 }} />
        )}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        {slices.map((s, i) => (
          <li key={s.key} className="inline-flex items-center gap-2 text-ink">
            <span className={`h-2.5 w-2.5 rounded-full ${COLORS[i % COLORS.length]}`} aria-hidden />
            {s.name} <span className="font-semibold tabular-nums">{s.students}</span>
          </li>
        ))}
        {withoutInstructor > 0 && (
          <li className="inline-flex items-center gap-2 text-ink">
            <span className="h-2.5 w-2.5 rounded-full bg-[#D9D3C8]" aria-hidden />
            Sin profesor <span className="font-semibold tabular-nums">{withoutInstructor}</span>
          </li>
        )}
      </ul>
    </div>
  )
}

export function UnassignedLink({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <p className="text-sm text-muted">
      {count} sin profesor ·{' '}
      <Link href="/admin/alumnos?profesor=sin" className="font-medium text-moss hover:text-moss-dark">
        Asignar →
      </Link>
    </p>
  )
}
