'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className="rounded-full border border-sand px-4 py-1.5 text-xs font-medium text-ink/70 transition hover:border-moss hover:text-moss"
    >
      Cerrar sesión
    </button>
  )
}
