import Link from 'next/link'
import type { RecoveryCardData } from './types'

/** Recuperaciones en curso: pedidas (esperando aprobación) o disponibles para elegir. */
export function RecoveriesSection({ items }: { items: RecoveryCardData[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="font-display text-[22px] font-normal italic leading-tight text-ink">Tus recuperaciones</h2>
      <ul className="mt-3 space-y-3">
        {items.map((r) =>
          r.status === 'requested' ? (
            <li key={r.id} className="rounded-2xl border border-[#F0E3C4] bg-[#FDF8EE] p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-slot-freed px-2.5 py-0.5 text-[11px] font-semibold text-slot-freed-ink">
                  Esperando aprobación
                </span>
                <span className="text-xs text-muted">Te avisamos acá</span>
              </div>
              <p className="mt-2 font-display text-xl italic text-ink">{r.title}</p>
              <p className="mt-0.5 text-[13px] text-muted">{r.origin}</p>
            </li>
          ) : (
            <li key={r.id} className="rounded-2xl border border-[#DCE7DE] bg-moss-soft p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full bg-slot-free px-2.5 py-0.5 text-[11px] font-semibold text-slot-free-ink">
                  Disponible
                </span>
                <span className="text-xs font-semibold text-slot-free-ink">Hasta el {r.until}</span>
              </div>
              <p className="mt-2 font-display text-xl italic text-ink">{r.title}</p>
              <p className="mt-0.5 text-[13px] text-muted">{r.origin}</p>
              <Link
                href={`/alumno/recuperar/${r.id}`}
                className="mt-3 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2B2A26] px-5 text-sm font-semibold text-white transition hover:bg-black max-sm:w-full"
              >
                Elegir clase
              </Link>
            </li>
          )
        )}
      </ul>
    </section>
  )
}
