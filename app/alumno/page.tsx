import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, DAY_ORDER, formatTime } from '@/lib/day-names'
import { getPaymentStatus, STATUS_LABEL, STATUS_CLASSES } from '@/lib/billing'

type MyClassRow = {
  id: string
  class_id: string
  classes: {
    room: string
    day_of_week: number
    start_time: string
    end_time: string
    class_types: { name: string } | null
    profiles: { full_name: string } | null
  } | null
}

export default async function AlumnoDashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('enrollments')
    .select('id, class_id, classes(room, day_of_week, start_time, end_time, class_types(name), profiles(full_name))')
    .eq('student_id', user?.id ?? '')
    .eq('status', 'active')

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('end_date, plans(name)')
    .eq('student_id', user?.id ?? '')
    .eq('status', 'active')
    .maybeSingle()

  const { data: settings } = await supabase
    .from('studio_settings')
    .select('payment_reminder_days_before')
    .single()

  const status = getPaymentStatus(
    subscription?.end_date ?? null,
    settings?.payment_reminder_days_before ?? 3
  )
  const planInfo = subscription?.plans as unknown as { name: string } | null

  const enrollments = (data ?? []) as unknown as MyClassRow[]

  const byDay = new Map<number, MyClassRow[]>()
  for (const day of DAY_ORDER) byDay.set(day, [])
  for (const e of enrollments) {
    if (!e.classes) continue
    byDay.get(e.classes.day_of_week)?.push(e)
  }
  for (const list of byDay.values()) {
    list.sort((a, b) => (a.classes?.start_time ?? '').localeCompare(b.classes?.start_time ?? ''))
  }

  const activeDays = DAY_ORDER.filter((day) => (byDay.get(day)?.length ?? 0) > 0)

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Mi semana</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink sm:text-4xl">Tu horario</h1>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-sand bg-white px-5 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-ink/40">Tu cuota</p>
          <p className="mt-0.5 font-display italic text-ink">
            {planInfo?.name ?? 'Sin plan asignado'}
          </p>
          {subscription?.end_date && (
            <p className="text-xs text-ink/40">
              Pagado hasta{' '}
              {new Date(`${subscription.end_date}T00:00:00`).toLocaleDateString('es-AR', {
                day: 'numeric',
                month: 'long',
              })}
            </p>
          )}
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${STATUS_CLASSES[status]}`}>
          {STATUS_LABEL[status]}
        </span>
      </div>

      {activeDays.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-sand bg-white/50 px-6 py-14 text-center">
          <p className="font-display text-xl italic text-ink">Todavía no tenés clases asignadas</p>
          <p className="mt-2 text-sm text-ink/60">
            Hablá con el estudio para que te anoten a tu horario fijo.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {activeDays.map((day) => (
            <section key={day} className="lg:min-w-0">
              <h2 className="text-sm font-medium uppercase tracking-wide text-ink/50">
                {DAY_NAMES[day]}
              </h2>
              <div className="mt-2 space-y-3">
                {byDay.get(day)?.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-2xl border border-sand bg-white px-4 py-4 shadow-[0_2px_12px_rgba(46,43,38,0.04)]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-lg italic leading-tight text-ink">
                        {e.classes?.class_types?.name}
                      </p>
                      <span className="whitespace-nowrap rounded-full bg-blush px-2.5 py-1 text-xs tabular-nums text-ink">
                        {formatTime(e.classes?.start_time ?? '')}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs text-ink/50">
                      {e.classes?.room} · {e.classes?.profiles?.full_name ?? 'Sin instructor'}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
