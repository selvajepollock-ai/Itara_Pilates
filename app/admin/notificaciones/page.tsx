import { createClient } from '@/lib/supabase/server'
import { NewAnnouncementForm } from './new-announcement-form'
import { DeleteAnnouncementButton } from './delete-announcement-button'

export default async function NotificacionesPage() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, message, expires_at, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Notificaciones masivas</h1>
      <p className="mt-2 text-sm text-ink/60">
        Se muestran como aviso en el panel de todos los alumnos e instructores.
      </p>

      <NewAnnouncementForm />

      <ul className="mt-8 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
        {announcements?.map((a) => {
          const isExpired = a.expires_at ? a.expires_at < today : false
          return (
            <li key={a.id} className="flex items-start justify-between gap-3 px-5 py-4">
              <div className={isExpired ? 'opacity-40' : ''}>
                <p className="text-sm text-ink">{a.message}</p>
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
