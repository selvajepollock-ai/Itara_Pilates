import Link from 'next/link'
import { Plus, Upload } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getPaymentStatus } from '@/lib/billing'
import { isNoAccessEmail } from '@/lib/auth-username'
import { StudentsList } from './students-list'
import { SignupRequestsSection } from './signup-requests-section'
export default async function AlumnosPage() {
  const supabase = await createClient()
  const [{ data: students }, { data: subscriptions }, { data: settings }, { data: signupRequests }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('id, full_name, nickname, email, contact_email, phone, active, created_at')
        .contains('roles', ['student'])
        .order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('student_id, end_date').eq('status', 'active'),
      supabase.from('studio_settings').select('payment_reminder_days_before, payment_due_day').single(),
      supabase
        .from('signup_requests')
        .select('id, first_name, last_name, email, phone, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
    ])
  const endDateByStudent = new Map((subscriptions ?? []).map((s) => [s.student_id, s.end_date]))
  const reminderDays = settings?.payment_reminder_days_before ?? 3
  const graceDay = settings?.payment_due_day ?? 10
  const studentsWithStatus = (students ?? []).map((s) => ({
    ...s,
    hasAccess: !isNoAccessEmail(s.email),
    displayEmail: isNoAccessEmail(s.email) ? s.contact_email ?? null : s.email,
    status: getPaymentStatus(endDateByStudent.get(s.id) ?? null, reminderDays, graceDay),
  }))
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
          <h1 className="mt-2 font-display text-3xl italic text-ink">Alumnos</h1>
          <p className="mt-1 text-sm text-ink/50">{students?.length ?? 0} en total</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/alumnos/importar"
            className="flex items-center gap-1.5 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink/70 transition hover:bg-sand/40"
          >
            <Upload size={16} strokeWidth={2.5} />
            Importar masivo
          </Link>
          <Link
            href="/admin/alumnos/nuevo"
            className="flex items-center gap-1.5 rounded-full bg-moss px-5 py-2.5 text-sm font-medium text-white transition hover:bg-moss-dark"
          >
            <Plus size={16} strokeWidth={2.5} />
            Nuevo alumno
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <SignupRequestsSection requests={signupRequests ?? []} />
        <StudentsList students={studentsWithStatus} />
      </div>
    </div>
  )
}
