import { createClient } from '@/lib/supabase/server'
import { suggestNextDueDate } from '@/lib/billing'
import { NewStudentForm } from './new-student-form'

export default async function NuevoAlumnoPage() {
  const supabase = await createClient()

  const [{ data: plans }, { data: settings }] = await Promise.all([
    supabase.from('plans').select('id, name, price').eq('active', true).order('price'),
    supabase.from('studio_settings').select('payment_due_day').single(),
  ])

  const dueDay = settings?.payment_due_day ?? 10
  const defaultEndDate = suggestNextDueDate(new Date(), dueDay)

  return <NewStudentForm plans={plans ?? []} defaultEndDate={defaultEndDate} />
}
