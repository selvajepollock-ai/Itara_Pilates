import Link from 'next/link'
import { formatARS } from '@/lib/currency'
import type { Bucket, Granularity } from './format'

const UNIT: Record<Granularity, string> = { day: 'día', week: 'semana', month: 'mes' }

/** Barras de ingresos por día, semana o mes (según el período). Presentación sobre los pagos ya cargados. */
export function IncomeChart({
  buckets,
  granularity,
  registryHref,
  bestLabel,
}: {
  buckets: Bucket[]
  granularity: Granularity
  registryHref: string
  /** Texto del mejor día ya armado (ej: "jueves 1 de octubre"). */
  bestLabel: string | null
}) {
  const max = Math.max(...buckets.map((b) => b.total), 1)
  const best = buckets.reduce<Bucket | null>((acc, b) => (b.total > (acc?.total ?? 0) ? b : acc), null)
  // 5 marcas de fecha repartidas en el eje.
  const ticks = buckets.length <= 5 ? buckets.map((_, i) => i) : [0, 1, 2, 3, 4].map((i) => Math.round((i * (buckets.length - 1)) / 4))

  return (
    <div>
      <div
        className="flex items-end gap-[3px]"
        style={{ height: 170 }}
        role="img"
        aria-label={`Ingresos por ${UNIT[granularity]}`}
      >
        {buckets.map((b) => {
          const tooltip = `${b.label}: ${formatARS(b.total)}${b.count ? ` (${b.count} ${b.count === 1 ? 'pago' : 'pagos'})` : ''}`
          const height = b.total > 0 ? Math.max((b.total / max) * 100, 3) : 2
          return (
            <div key={b.key} className="flex h-full flex-1 items-end" title={tooltip} aria-label={tooltip}>
              <div
                className={`w-full rounded-t-[4px] ${b.total > 0 ? 'bg-moss' : b.future ? 'bg-edge-row' : 'bg-edge-strong'}`}
                style={{ height: `${height}%` }}
              />
            </div>
          )
        })}
      </div>

      <div className="relative mt-2 h-4 text-[11px] text-muted" aria-hidden>
        {ticks.map((i, n) => (
          <span
            key={`${i}-${n}`}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{
              left: `${((i + 0.5) / buckets.length) * 100}%`,
              transform: n === 0 ? 'translateX(0)' : n === ticks.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
            }}
          >
            {granularity === 'month' ? buckets[i].label.split(' ')[0].slice(0, 3) : buckets[i].label.replace('Semana del ', '')}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
        {best && best.total > 0 ? (
          <p className="text-muted">
            Mejor {UNIT[granularity]}:{' '}
            <span className="font-medium text-ink">
              {granularity === 'day' && bestLabel ? bestLabel : best.label}, {formatARS(best.total)}
            </span>{' '}
            ({best.count} {best.count === 1 ? 'pago' : 'pagos'})
          </p>
        ) : (
          <p className="text-muted">Sin ingresos en el período.</p>
        )}
        <Link href={registryHref} className="text-[13px] font-medium text-moss hover:text-moss-dark">
          Ver registro diario →
        </Link>
      </div>
    </div>
  )
}
