import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadStudentRows } from '@/lib/student-rows'
import { AlumnosView } from './alumnos-view'
import { SignupRequestsSection } from './signup-requests-section'

export default async function AlumnosPage({ searchParams }: { searchParams: Promise<{ alumno?: string }> }) {
  const { alumno } = await searchParams
  if (alumno) redirect(`/admin/alumnos/${alumno}`)
  const supabase = await createClient()
  const [{ rows, dueDay }, { data: signupRequests }, { data: plansData }] = await Promise.all([
    loadStudentRows(supabase),
    supabase
      .from('signup_requests')
      .select('id, first_name, last_name, email, phone, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
    supabase.from('plans').select('id, name').eq('active', true).order('price'),
  ])

  return (
    <AlumnosView students={rows} plans={plansData ?? []} dueDay={dueDay}>
      <SignupRequestsSection requests={signupRequests ?? []} />
    </AlumnosView>
  )
}
