import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AlumnoHeader } from './alumno-header'

export default async function AlumnoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('roles, full_name')
    .eq('id', user.id)
    .single()
  // El "Volver al panel" también le sirve a quien entra como "Ver como alumno" desde el panel (rol developer).
  const isAdmin = (profile?.roles?.includes('admin') || profile?.roles?.includes('developer')) ?? false
  const initial = (profile?.full_name ?? '?').trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="min-h-screen bg-white">
      <AlumnoHeader initial={initial} isAdmin={isAdmin} />
      <main className="mx-auto max-w-[1120px] px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  )
}
