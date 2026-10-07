import type { NextClassData } from './types'

/** Próxima clase confirmada (excluye las avisadas e incluye recuperaciones aprobadas). Sin botones: las acciones están en "Tus clases". */
export function NextClassCard({ data, minHoursText }: { data: NextClassData | null; minHoursText: string }) {
  return (
    <section className="rounded-3xl bg-[#2F4A36] p-6 text-white shadow-[0_8px_24px_rgba(47,74,54,0.22)] lg:p-8">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Tu próxima clase</p>
        {data && <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{data.chip}</span>}
      </div>
      {data ? (
        <>
          <p className="mt-3 font-display text-[30px] italic leading-tight">
            {data.dayLabel} · <span className="tabular-nums">{data.start}</span>
          </p>
          <p className="mt-1 text-sm text-white/80">
            {data.typeName}
            {data.instructor ? ` · con ${data.instructor}` : ''}
          </p>
          <p className="mt-4 hidden text-[13px] text-white/70 lg:block">
            Si no podés ir, avisá hasta {minHoursText} antes y la recuperás esa semana o la siguiente.
          </p>
        </>
      ) : (
        <p className="mt-3 font-display text-2xl italic leading-tight">Sin próximas clases</p>
      )}
    </section>
  )
}
