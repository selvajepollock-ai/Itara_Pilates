import { ProgressBar } from '@/app/components/progress-bar'
import { StatusChip } from '@/app/components/status-chip'
import { SectionCard } from '@/app/components/section-card'
import { DAY_NAMES } from '@/lib/day-names'

export type OccupancyDay = { day: number; enrolled: number; capacity: number; pct: number }

/** Ocupación por día (lunes a viernes). El día de hoy va resaltado. */
export function OccupancyWeek({ days, todayDow }: { days: OccupancyDay[]; todayDow: number }) {
  const empty = days.every((d) => d.capacity === 0)

  return (
    <SectionCard title="Ocupación por día">
      {empty ? (
        <p className="text-sm text-muted">Todavía no hay alumnos anotados en el horario.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {days.map((d) => {
            const isToday = d.day === todayDow
            return (
              <div
                key={d.day}
                className={`flex flex-col gap-2 rounded-[12px] border p-3.5 last:col-span-2 sm:last:col-span-1 ${
                  isToday ? 'border-moss/30 bg-moss-soft' : 'border-edge-divider'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-ink">{DAY_NAMES[d.day]}</span>
                  {isToday && <StatusChip tone="success">Hoy</StatusChip>}
                </div>
                <span className="text-2xl font-semibold tabular-nums text-ink">{d.pct}%</span>
                <ProgressBar
                  value={d.pct}
                  tone={d.pct >= 90 ? 'dark' : 'primary'}
                  label={`Ocupación del ${DAY_NAMES[d.day]}`}
                />
                <span className="text-xs tabular-nums text-muted">
                  {d.enrolled}/{d.capacity} lugares
                </span>
              </div>
            )
          })}
        </div>
      )}
    </SectionCard>
  )
}
