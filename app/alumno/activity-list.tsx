import type { ActivityItem } from './types'

const DOT = { yellow: 'bg-[#C9962E]', green: 'bg-state-ok', red: 'bg-danger' }

/** Últimos movimientos: punto de color (amarillo avisos y pedidos, verde aprobaciones, rojo vencimientos), texto y fecha. */
export function ActivityList({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null
  return (
    <section>
      <h2 className="font-display text-[22px] font-normal italic leading-tight text-ink">Actividad reciente</h2>
      <ul className="mt-3 divide-y divide-edge-row rounded-2xl border border-edge bg-white">
        {items.map((a, i) => (
          <li key={i} className="flex items-center gap-3 px-5 py-3.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT[a.tone]}`} aria-hidden />
            <p className="min-w-0 flex-1 text-sm text-ink">{a.text}</p>
            <span className="shrink-0 text-xs text-muted">{a.date}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
