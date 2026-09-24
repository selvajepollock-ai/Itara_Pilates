import { CalendarX, RefreshCw, Repeat, Clock, Bell, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'
import { formatARS } from '@/lib/currency'
import { relativeTime } from '@/lib/relative-time'
import { ResolvePlanRequestButton } from './resolve-plan-request-button'
import { RecoveryRequestActions } from './recovery-request-actions'

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

const FEED_DAYS = 14

export default async function AvisosPage() {
  const supabase = await createClient()

  // Marcar como vistas todas las cancelaciones nuevas (apaga la campanita)
  await supabase.from('session_cancellations').update({ acknowledged: true }).eq('acknowledged', false)

  // Cuándo miró el admin esta pantalla por última vez (para separar nuevo / visto).
  // Tolerante a que la columna todavía no exista (deploy antes de la migración 034).
  let lastSeenAt: string | null = null
  try {
    const { data: settingsBefore } = await supabase
      .from('studio_settings')
      .select('avisos_seen_at')
      .maybeSingle()
    lastSeenAt = (settingsBefore?.avisos_seen_at as string | null) ?? null
    await supabase
      .from('studio_settings')
      .update({ avisos_seen_at: new Date().toISOString() })
      .eq('id', 1)
  } catch {
    // sin columna todavía: se muestra todo como "nuevo"
  }

  const feedCutoff = new Date(Date.now() - FEED_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const [{ data: cancellationsData }, { data: recoveriesData }, { data: pendingCredits }] =
    await Promise.all([
      supabase
        .from('session_cancellations')
        .select(
          'id, session_date, within_deadline, cancelled_at, profiles(full_name), classes(day_of_week, start_time, class_types(name))'
        )
        .gte('cancelled_at', feedCutoff)
        .order('cancelled_at', { ascending: false })
        .limit(50),
      supabase
        .from('attendance')
        .select(
          'id, session_date, created_at, profiles!attendance_student_id_fkey(full_name), classes(day_of_week, start_time, class_types(name))'
        )
        .not('recovery_credit_id', 'is', null)
        .gte('created_at', feedCutoff)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('recovery_credits')
        .select(
          'id, week_end, created_at, class_types(name), profiles(full_name), requested_class_id, requested_session_date, classes:requested_class_id(day_of_week, start_time, room), session_cancellations:source_cancellation_id(session_date, classes(day_of_week, start_time))'
        )
        .eq('status', 'requested')
        .order('created_at', { ascending: false }),
    ])

  const { data: planRequests } = await supabase
    .from('plan_change_requests')
    .select('id, note, created_at, profiles(full_name), plans(name, price)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  const cancellations = (cancellationsData ?? []) as unknown as CancellationRow[]
  const recoveries = (recoveriesData ?? []) as unknown as RecoveryRow[]

  type FeedItem =
    | { kind: 'cancel'; at: string; row: CancellationRow }
    | { kind: 'recover'; at: string; row: RecoveryRow }

  const feed: FeedItem[] = [
    ...cancellations.map((row): FeedItem => ({ kind: 'cancel', at: row.cancelled_at, row })),
    ...recoveries.map((row): FeedItem => ({ kind: 'recover', at: row.created_at, row })),
  ].sort((a, b) => b.at.localeCompare(a.at))

  const nuevos = lastSeenAt ? feed.filter((i) => i.at > lastSeenAt) : feed
  const vistos = lastSeenAt ? feed.filter((i) => i.at <= lastSeenAt) : []

  const pendingActionCount = (pendingCredits?.length ?? 0) + (planRequests?.length ?? 0)

  function FeedRow({ item, dimmed = false }: { item: FeedItem; dimmed?: boolean }) {
    const typeName = item.row.classes?.class_types?.name
    const dayLabel = item.row.classes ? DAY_NAMES[item.row.classes.day_of_week] : ''
    const timeLabel = item.row.classes ? formatTime(item.row.classes.start_time) : ''
    const name = item.row.profiles?.full_name ?? 'Alumno'
    const isRecent = Date.now() - new Date(item.at).getTime() < 3 * 60 * 60 * 1000

    return (
      <li className={`flex items-center gap-3 px-5 py-4 ${dimmed ? 'opacity-55' : ''}`}>
        <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blush text-xs font-medium text-ink">
          {name.slice(0, 1).toUpperCase()}
          {isRecent && !dimmed && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-moss" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink">
            <span className="font-medium">{name}</span>{' '}
            {item.kind === 'cancel'
              ? (item.row as CancellationRow).within_deadline
                ? 'avisó que no va — tiene una recuperación para agendar'
                : 'avisó que no va (fuera de horario, sin recuperación)'
              : 'se anotó a recuperar'}
          </p>
          <p className="mt-0.5 truncate text-xs text-ink/40">
            {typeName} · {dayLabel} {timeLabel} ·{' '}
            {new Date(`${item.row.session_date}T00:00:00`).toLocaleDateString('es-AR', {
              day: 'numeric',
              month: 'short',
            })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full ${
              item.kind === 'cancel' ? 'bg-clay/10 text-clay' : 'bg-moss/10 text-moss'
            }`}
          >
            {item.kind === 'cancel' ? <CalendarX size={14} /> : <RefreshCw size={14} />}
          </div>
          <span className="whitespace-nowrap text-[10px] text-ink/30">{relativeTime(item.at)}</span>
        </div>
      </li>
    )
  }

  return (
    <div className="max-w-2xl">
      <p className="eyebrow">Estudio</p>
      <h1 className="mt-2 page-title">Avisos</h1>
      <p className="mt-2 text-sm text-ink/60">
        Quién avisó que no venía y quién se anotó a recuperar.
      </p>

      {pendingActionCount > 0 && (
        <div className="mt-8">
          <p className="section-title flex items-center gap-1.5 text-clay">
            <Bell size={13} />
            Requiere tu atención ({pendingActionCount})
          </p>
          <ul className="mt-3 divide-y divide-clay/20 rounded-2xl border border-clay/30 bg-clay/5">
            {pendingCredits?.map((c) => {
              const requestedClass = c.classes as unknown as {
                day_of_week: number
                start_time: string
                room: string
              } | null
              const originalCancellation = c.session_cancellations as unknown as {
                session_date: string
                classes: { day_of_week: number; start_time: string } | null
              } | null
              return (
                <li key={`credit-${c.id}`} className="flex items-center gap-3 px-5 py-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
                    <Clock size={15} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink">
                      <span className="font-medium">
                        {(c.profiles as unknown as { full_name: string } | null)?.full_name}
                      </span>{' '}
                      quiere pasar su clase de <span className="font-medium">Pilates</span>
                      {originalCancellation && (
                        <>
                          {' '}
                          del{' '}
                          <span className="font-medium">
                            {DAY_NAMES[originalCancellation.classes?.day_of_week ?? 0]}{' '}
                            {formatTime(originalCancellation.classes?.start_time ?? '')}
                            {` (${new Date(`${originalCancellation.session_date}T00:00:00`).toLocaleDateString(
                              'es-AR',
                              { day: 'numeric', month: 'short' }
                            )})`}
                          </span>
                        </>
                      )}{' '}
                      al{' '}
                      {requestedClass ? (
                        <span className="font-medium">
                          {DAY_NAMES[requestedClass.day_of_week]} {formatTime(requestedClass.start_time)}
                          {c.requested_session_date &&
                            ` (${new Date(`${c.requested_session_date}T00:00:00`).toLocaleDateString('es-AR', {
                              day: 'numeric',
                              month: 'short',
                            })})`}
                        </span>
                      ) : (
                        'un horario'
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-ink/40">{relativeTime(c.created_at)}</p>
                  </div>
                  <RecoveryRequestActions creditId={c.id} />
                </li>
              )
            })}

            {planRequests?.map((r) => (
              <li key={`plan-${r.id}`} className="flex items-center gap-3 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay/10 text-clay">
                  <Repeat size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">
                    <span className="font-medium">
                      {(r.profiles as unknown as { full_name: string } | null)?.full_name}
                    </span>{' '}
                    quiere pasarse a{' '}
                    <span className="font-medium">
                      {(r.plans as unknown as { name: string } | null)?.name}
                    </span>{' '}
                    ({formatARS((r.plans as unknown as { price: number } | null)?.price ?? 0)})
                  </p>
                  {r.note && <p className="mt-0.5 text-xs text-ink/50">"{r.note}"</p>}
                  <p className="mt-0.5 text-xs text-ink/40">{relativeTime(r.created_at)}</p>
                </div>
                <ResolvePlanRequestButton requestId={r.id} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 section-title">Actividad reciente</p>

      {feed.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-sand bg-white px-5 py-12 text-center text-sm text-ink/40">
          Sin movimientos en los últimos {FEED_DAYS} días.
        </p>
      ) : nuevos.length > 0 ? (
        <>
          <p className="mt-2 flex items-center gap-2 text-xs font-medium text-moss">
            {lastSeenAt ? 'Nuevo desde tu última visita' : 'Sin ver'}
            <span className="rounded-full bg-moss/10 px-2 py-0.5 text-[10px] font-semibold text-moss">
              {nuevos.length}
            </span>
          </p>
          <ul className="mt-2 divide-y divide-sand/60 rounded-2xl border border-moss/40 bg-white">
            {nuevos.map((item) => (
              <FeedRow key={`${item.kind}-${item.row.id}`} item={item} />
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 rounded-2xl border border-sand bg-white px-5 py-6 text-center text-sm text-ink/45">
          Nada nuevo — ya miraste todo ✨
        </p>
      )}

      {vistos.length > 0 && (
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs text-ink/40 hover:text-ink/70">
            <ChevronRight size={13} className="transition group-open:rotate-90" />
            Ver actividad anterior ({vistos.length})
          </summary>
          <ul className="mt-2 divide-y divide-sand/50 rounded-2xl border border-sand bg-linen/30">
            {vistos.map((item) => (
              <FeedRow key={`${item.kind}-${item.row.id}`} item={item} dimmed />
            ))}
          </ul>
        </details>
      )}

      <p className="mt-6 text-xs text-ink/30">
        La actividad de más de {FEED_DAYS} días se oculta sola. Las solicitudes que necesitan tu
        respuesta aparecen arriba, en "Requiere tu atención".
      </p>
    </div>
  )
}
