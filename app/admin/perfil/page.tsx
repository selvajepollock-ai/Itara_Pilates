import { Settings2, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { EditMyProfileForm } from './edit-profile-form'
import { SetMyPasswordForm } from './set-password-form'
import { StudioSettingsForm } from './studio-settings-form'
export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from('profiles').select('full_name, email, username').eq('id', user?.id ?? '').single(),
    supabase
      .from('studio_settings')
      .select(
        'cancellation_min_hours, payment_due_day, payment_reminder_days_before, drop_in_price_1, drop_in_price_2, drop_in_price_3, drop_in_price_4_plus'
      )
      .single(),
  ])
  return (
    <div className="max-w-4xl">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Tu cuenta</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Mi perfil</h1>
      <p className="mt-2 text-sm text-ink/60">Tus datos y la configuración general del estudio.</p>
      {/* Configuración del estudio — destacada, es lo más importante de esta pantalla */}
      <div className="mt-8 rounded-2xl border-2 border-moss/30 bg-moss/5 p-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-moss text-white">
            <Settings2 size={16} />
          </div>
          <div>
            <p className="font-display text-xl italic text-ink">Configuración del estudio</p>
            <p className="text-xs text-ink/50">
              Estas reglas aplican a TODOS los alumnos — revisalas con cuidado.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <StudioSettingsForm
            settings={{
              cancellation_min_hours: settings?.cancellation_min_hours ?? 2,
              payment_due_day: settings?.payment_due_day ?? 10,
              payment_reminder_days_before: settings?.payment_reminder_days_before ?? 3,
              drop_in_price_1: settings?.drop_in_price_1 ?? 10000,
              drop_in_price_2: settings?.drop_in_price_2 ?? 9000,
              drop_in_price_3: settings?.drop_in_price_3 ?? 8000,
              drop_in_price_4_plus: settings?.drop_in_price_4_plus ?? 7000,
            }}
          />
        </div>
      </div>
      {/* Mi cuenta — datos personales, secundario */}
      <div className="mt-10">
        <div className="flex items-center gap-2">
          <User size={15} className="text-ink/40" />
          <p className="text-xs uppercase tracking-[0.25em] text-ink/40">Mi cuenta</p>
        </div>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <EditMyProfileForm
            profile={{
              full_name: profile?.full_name ?? '',
              email: profile?.email ?? user?.email ?? '',
              username: profile?.username ?? null,
            }}
          />
          <div>
            <div className="rounded-2xl border border-sand bg-white p-6">
              <p className="text-xs font-medium uppercase tracking-wide text-ink/60">Contraseña</p>
              <p className="mt-1 text-sm text-ink/50">Cambiá tu contraseña de acceso.</p>
              <div className="mt-4">
                <SetMyPasswordForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
