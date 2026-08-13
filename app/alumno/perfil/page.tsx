import { createClient } from '@/lib/supabase/server'
import { EditMyProfileForm } from './edit-profile-form'

export default async function AlumnoPerfilPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, nickname, phone, birth_date, username, email')
    .eq('id', user?.id ?? '')
    .single()

  return (
    <div className="max-w-md">
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Tu cuenta</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Mi perfil</h1>
      <p className="mt-2 text-sm text-ink/60">Tus datos personales.</p>

      <EditMyProfileForm
        profile={{
          full_name: profile?.full_name ?? '',
          nickname: profile?.nickname ?? '',
          phone: profile?.phone ?? '',
          birth_date: profile?.birth_date ?? '',
          username: profile?.username ?? '',
          email: profile?.email ?? user?.email ?? '',
        }}
      />
    </div>
  )
}
