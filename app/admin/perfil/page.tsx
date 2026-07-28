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
    supabase.from('profiles').select('full_name, email').eq('id', user?.id ?? '').single(),
    supabase
      .from('studio_settings')
      .select('cancellation_min_hours, payment_due_day, payment_reminder_days_before')
      .single(),
  ])

  return (
    <div className="max-w-md">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Tu cuenta</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Mi perfil</h1>
      <p className="mt-2 text-sm text-ink/60">Tus datos como dueña/admin del estudio.</p>

      <EditMyProfileForm
        profile={{ full_name: profile?.full_name ?? '', email: profile?.email ?? user?.email ?? '' }}
      />

      <h2 className="mt-10 text-xs uppercase tracking-[0.25em] text-moss">Contraseña</h2>
      <p className="mt-1 text-sm text-ink/50">Cambiá tu contraseña de acceso.</p>
      <SetMyPasswordForm />

      <h2 className="mt-10 text-xs uppercase tracking-[0.25em] text-moss">
        Configuración del estudio
      </h2>
      <p className="mt-1 text-sm text-ink/50">
        Reglas generales que aplican a todo el estudio.
      </p>
      <StudioSettingsForm
        settings={{
          cancellation_min_hours: settings?.cancellation_min_hours ?? 2,
          payment_due_day: settings?.payment_due_day ?? 10,
          payment_reminder_days_before: settings?.payment_reminder_days_before ?? 3,
        }}
      />
    </div>
  )
}
