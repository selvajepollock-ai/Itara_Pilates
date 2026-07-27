import { Megaphone } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export async function AnnouncementsBanner() {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data: announcements } = await supabase
    .from('announcements')
    .select('id, message')
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order('created_at', { ascending: false })

  if (!announcements || announcements.length === 0) return null

  return (
    <div className="mb-6 space-y-2">
      {announcements.map((a) => (
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
