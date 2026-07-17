import { createClient } from '@/lib/supabase/server'
import { EditMyProfileForm } from './edit-profile-form'
import { SetMyPasswordForm } from './set-password-form'

export default async function PerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user?.id ?? '')
    .single()

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
    </div>
  )
}
