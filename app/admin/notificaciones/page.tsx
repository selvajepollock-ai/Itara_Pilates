import { createClient } from '@/lib/supabase/server'
import { DAY_NAMES, formatTime } from '@/lib/day-names'
import { NewAnnouncementForm } from './new-announcement-form'
import { DeleteAnnouncementButton } from './delete-announcement-button'

export default async function NotificacionesPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [{ data: announcements }, { data: classes }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, message, expires_at, created_at, target_type, target_usernames, target_class_id')
      .order('created_at', { ascending: false }),
    supabase
      .from('classes')
      .select('id, day_of_week, start_time, class_types(name)')
      .eq('active', true)
      .order('day_of_week')
      .order('start_time'),
  ])

  type ClassOption = { id: string; day_of_week: number; start_time: string; class_types: { name: string } | null }
  const classOptions = ((classes ?? []) as unknown as ClassOption[]).map((c) => ({
    id: c.id,
    label: `${DAY_NAMES[c.day_of_week]} ${formatTime(c.start_time)} — ${c.class_types?.name ?? 'Clase'}`,
  }))
  const classLabelById = new Map(classOptions.map((c) => [c.id, c.label]))

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Notificaciones masivas</h1>
      <p className="mt-2 text-sm text-ink/60">
        Se muestran como aviso en el panel de todos los alumnos e instructores, o solo a quien elijas.
      </p>
      <NewAnnouncementForm classOptions={classOptions} />
      <ul className="mt-8 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
        {announcements?.map((a) => {
          const isExpired = a.expires_at ? a.expires_at < today : false
          const targetLabel =
            a.target_type === 'people'
              ? `Para: ${(a.target_usernames ?? []).map((u: string) => `@${u}`).join(', ')}`
              : a.target_type === 'class'
                ? `Para: ${classLabelById.get(a.target_class_id ?? '') ?? 'clase eliminada'}`
                : null
          return (
            <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-4">
              <div className={isExpired ? 'opacity-40' : ''}>
                <p className="text-sm text-ink">{a.message}</p>
                {targetLabel && (
                  <p className="mt-0.5 text-xs font-medium text-clay">{targetLabel}</p>
                )}
                <p className="mt-1 text-xs text-ink/40">
                  {new Date(a.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                  {a.expires_at &&
                    ` · vence ${new Date(`${a.expires_at}T00:00:00`).toLocaleDateString('es-AR', {
                      day: 'numeric',
                      month: 'short',
                    })}`}
                  {isExpired && ' · vencido'}
                </p>
              </div>
              <DeleteAnnouncementButton announcementId={a.id} />
            </li>
          )
        })}
        {(!announcements || announcements.length === 0) && (
          <li className="px-5 py-10 text-center text-sm text-ink/40">
            Todavía no enviaste ninguna notificación.
          </li>
        )}
      </ul>
    </div>
  )
}
