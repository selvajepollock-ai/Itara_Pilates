import { CalendarX, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'

type CancellationRow = {
  id: string
  session_date: string
  within_deadline: boolean
  cancelled_at: string
  profiles: { full_name: string } | null
  classes: { day_of_week: number; start_time: string; class_types: { name: string } | null } | null
}

type RecoveryRow = {
  id: string
  session_date: string
  created_at: string
  profiles: { full_name: string } | null
  classes: { day_of_week: number; start_time: string; class_types: { name: string } | null } | null
}

export default async function AvisosPage() {
  const supabase = await createClient()

  const [{ data: cancellationsData }, { data: recoveriesData }] = await Promise.all([
    supabase
      .from('session_cancellations')
      .select(
        'id, session_date, within_deadline, cancelled_at, profiles(full_name), classes(day_of_week, start_time, class_types(name))'
      )
      .order('cancelled_at', { ascending: false })
      .limit(20),
    supabase
      .from('attendance')
      .select(
        'id, session_date, created_at, profiles(full_name), classes(day_of_week, start_time, class_types(name))'
      )
      .not('recovery_credit_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const cancellations = (cancellationsData ?? []) as unknown as CancellationRow[]
  const recoveries = (recoveriesData ?? []) as unknown as RecoveryRow[]

  type FeedItem =
    | { kind: 'cancel'; at: string; row: CancellationRow }
    | { kind: 'recover'; at: string; row: RecoveryRow }

  const feed: FeedItem[] = [
    ...cancellations.map((row): FeedItem => ({ kind: 'cancel', at: row.cancelled_at, row })),
    ...recoveries.map((row): FeedItem => ({ kind: 'recover', at: row.created_at, row })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Avisos</h1>
      <p className="mt-2 text-sm text-ink/60">
        Quién avisó que no venía y quién se anotó a recuperar.
      </p>

      <ul className="mt-8 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
        {feed.map((item) => {
          const typeName = item.row.classes?.class_types?.name
          const dayLabel = item.row.classes ? DAY_NAMES[item.row.classes.day_of_week] : ''
          const timeLabel = item.row.classes ? formatTime(item.row.classes.start_time) : ''

          return (
            <li key={`${item.kind}-${item.row.id}`} className="flex items-start gap-3 px-5 py-4">
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  item.kind === 'cancel' ? 'bg-clay/10 text-clay' : 'bg-moss/10 text-moss'
                }`}
              >
                {item.kind === 'cancel' ? <CalendarX size={15} /> : <RefreshCw size={15} />}
              </div>
              <div>
                <p className="text-sm text-ink">
                  <span className="font-medium">{item.row.profiles?.full_name}</span>{' '}
                  {item.kind === 'cancel'
                    ? (item.row as CancellationRow).within_deadline
                      ? 'avisó que no va y le queda crédito para recuperar'
                      : 'avisó que no va (fuera de horario, sin recuperación)'
                    : 'se anotó a recuperar'}
                </p>
                <p className="mt-0.5 text-xs text-ink/40">
                  {typeName} · {dayLabel} {timeLabel} ·{' '}
                  {new Date(`${item.row.session_date}T00:00:00`).toLocaleDateString('es-AR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            </li>
          )
        })}
        {feed.length === 0 && (
          <li className="px-5 py-14 text-center text-sm text-ink/40">
            Todavía no hay avisos.
          </li>
        )}
      </ul>
    </div>
  )
}
