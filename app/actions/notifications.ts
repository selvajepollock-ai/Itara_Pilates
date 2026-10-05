'use server'

import { createClient } from '@/lib/supabase/server'

export type MyNotification = {
  id: string
  kind: string
  title: string
  body: string
  url: string | null
  read: boolean
  createdAt: string
}

const KEEP_DAYS = 30

async function currentUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

/** Bandeja de la persona en sesión. Las de más de 30 días se borran solas al cargarla. */
export async function getMyNotifications(): Promise<{ items: MyNotification[] }> {
  const { supabase, user } = await currentUser()
  if (!user) return { items: [] }

  const cutoff = new Date(Date.now() - KEEP_DAYS * 86_400_000).toISOString()
  await supabase.from('user_notifications').delete().eq('user_id', user.id).lt('created_at', cutoff)

  const { data } = await supabase
    .from('user_notifications')
    .select('id, kind, title, body, url, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  return {
    items: (data ?? []).map((n) => ({
      id: n.id as string,
      kind: n.kind as string,
      title: n.title as string,
      body: (n.body as string) ?? '',
      url: (n.url as string | null) ?? null,
      read: Boolean(n.read_at),
      createdAt: n.created_at as string,
    })),
  }
}

export async function markNotificationRead(id: string) {
  const { supabase, user } = await currentUser()
  if (!user) return
  await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', id).eq('user_id', user.id)
}

export async function markAllNotificationsRead() {
  const { supabase, user } = await currentUser()
  if (!user) return
  await supabase
    .from('user_notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('read_at', null)
}

export async function deleteNotification(id: string) {
  const { supabase, user } = await currentUser()
  if (!user) return
  await supabase.from('user_notifications').delete().eq('id', id).eq('user_id', user.id)
}

export async function clearNotifications() {
  const { supabase, user } = await currentUser()
  if (!user) return
  await supabase.from('user_notifications').delete().eq('user_id', user.id)
}
