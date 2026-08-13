import { createClient } from '@/lib/supabase/server'
import { suggestNextDueDate } from '@/lib/billing'
import { NewStudentForm } from './new-student-form'

export default async function NuevoAlumnoPage({
  searchParams,
}: {
  searchParams: Promise<{
    requestId?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    username?: string
  }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const [{ data: plans }, { data: settings }] = await Promise.all([
    supabase.from('plans').select('id, name, price').eq('active', true).order('price'),
    supabase.from('studio_settings').select('payment_due_day').single(),
  ])

  const dueDay = settings?.payment_due_day ?? 10
  const defaultEndDate = suggestNextDueDate(new Date(), dueDay)

  return (
    <NewStudentForm
      plans={plans ?? []}
      defaultEndDate={defaultEndDate}
      requestId={params.requestId}
      defaultFirstName={params.first_name ?? ''}
      defaultLastName={params.last_name ?? ''}
      defaultEmail={params.email ?? ''}
      defaultPhone={params.phone ?? ''}
      defaultUsername={params.username ?? ''}
    />
  )
}
