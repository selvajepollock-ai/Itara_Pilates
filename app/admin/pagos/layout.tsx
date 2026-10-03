import { createClient } from '@/lib/supabase/server'
import { loadQuickPaymentStudents } from '@/lib/quick-payment-students'
import { PageHeader } from '@/app/components/page-header'
import { PagosNav } from './pagos-nav'
import { RegisterPaymentButton } from './register-payment-button'
import { MoneyPrivacyProvider, PrivacyToggleButton } from './privacy'

export default async function PagosLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const students = await loadQuickPaymentStudents(supabase)

  return (
    <MoneyPrivacyProvider>
      <PageHeader
        title="Pagos"
        actions={
          <>
            <PrivacyToggleButton />
            <RegisterPaymentButton students={students} variant="header" />
          </>
        }
      />
      <PagosNav />
      <div className="mt-6">{children}</div>
      <RegisterPaymentButton students={students} variant="fab" />
    </MoneyPrivacyProvider>
  )
}
