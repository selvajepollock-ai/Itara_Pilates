'use client'

import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { RegisterPaymentDialog } from '../inicio/register-payment-dialog'

type Students = Parameters<typeof RegisterPaymentDialog>[0]['students']

/** "+ Registrar pago": abre el flujo de QuickPayment. En celular es un botón flotante sobre la barra inferior. */
export function RegisterPaymentButton({ students, variant }: { students: Students; variant: 'header' | 'fab' }) {
  const router = useRouter()
  const className =
    variant === 'header'
      ? 'btn-primary hidden lg:inline-flex'
      : 'fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 items-center gap-2 rounded-full bg-moss px-5 text-sm font-semibold text-white shadow-lg lg:hidden'
  return (
    <RegisterPaymentDialog students={students} className={className} onClosed={() => router.refresh()}>
      <Plus size={16} strokeWidth={2.5} />
      Registrar pago
    </RegisterPaymentDialog>
  )
}
