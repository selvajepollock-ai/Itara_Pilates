import { Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

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

  const today = new Date().toISOString().slice(0, 10)

  const [{ data: announcements }, { data: profile }] = await Promise.all([
    supabase
      .from('announcements')
      .select('id, message, target_type, target_usernames, target_class_id')
      .or(`expires_at.is.null,expires_at.gte.${today}`)
      .order('created_at', { ascending: false }),
    user
      ? supabase.from('profiles').select('username, roles').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

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

  return (
    <div className="mb-6 space-y-2">
      {visible.map((a) => (
        <div
          key={a.id}
          className="flex items-start gap-2.5 rounded-2xl border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-ink"
        >
          <Megaphone size={16} className="mt-0.5 shrink-0 text-clay" />
          <p>{a.message}</p>
        </div>
      ))}
    </div>
  )
}
