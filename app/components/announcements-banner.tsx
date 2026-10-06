import { createClient } from '@/lib/supabase/server'
import { todayART } from '@/lib/dates'
import { AnnouncementPopup } from './announcement-popup'

type Announcement = {
  id: string
  message: string
  target_type: string
  target_usernames: string[] | null
  target_class_id: string | null
}

export async function AnnouncementsBanner() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const today = todayART()

  const [{ data: announcements }, { data: profile }, { data: dismissals }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, message, target_type, target_usernames, target_class_id, urgent')
      .eq('urgent', true)
      .or(`expires_at.is.null,expires_at.gte.${today}`)
      .order('created_at', { ascending: false }),
    user
      ? supabase.from('profiles').select('username, roles').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from('announcement_dismissals').select('announcement_id').eq('user_id', user.id)
      : Promise.resolve({ data: [] as { announcement_id: string }[] }),
  ])
  const dismissed = new Set((dismissals ?? []).map((d) => d.announcement_id as string))

  if (!announcements || announcements.length === 0) return null

  const myUsername = profile?.username?.toLowerCase() ?? null
  const isInstructor = profile?.roles?.includes('instructor') ?? false

  let myClassIds = new Set<string>()
  if (user) {
    const [{ data: myEnrollments }, { data: myTaughtClasses }] = await Promise.all([
      supabase.from('enrollments').select('class_id').eq('student_id', user.id).eq('status', 'active'),
      isInstructor
        ? supabase.from('classes').select('id').eq('instructor_id', user.id)
        : Promise.resolve({ data: [] }),
    ])
    myClassIds = new Set([
      ...(myEnrollments ?? []).map((e) => e.class_id),
      ...(myTaughtClasses ?? []).map((c) => c.id),
    ])
  }

  const visible = (announcements as unknown as Announcement[]).filter((a) => {
    if (dismissed.has(a.id)) return false
    if (a.target_type === 'all') return true
    if (a.target_type === 'people') {
      return myUsername ? (a.target_usernames ?? []).includes(myUsername) : false
    }
    if (a.target_type === 'class') {
      return a.target_class_id ? myClassIds.has(a.target_class_id) : false
    }
    return true
  })

  if (visible.length === 0) return null

  // Solo los comunicados marcados como importantes aparecen como ventana emergente (el resto va a la campanita).
  return <AnnouncementPopup items={visible.map((a) => ({ id: a.id, message: a.message }))} />
}
