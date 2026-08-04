'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function MarkChargePaidButton({ chargeId, studentId }: { chargeId: string; studentId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  function handleClick() {
    if (!confirm('¿Marcar este cargo como pagado?')) return
    startTransition(async () => {
      await supabase
        .from('extra_charges')
        .update({ paid: true, paid_at: new Date().toISOString() })
        .eq('id', chargeId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="whitespace-nowrap rounded-full bg-moss px-3 py-1 text-xs font-medium text-white hover:bg-moss-dark disabled:opacity-50"
    >
      {isPending ? '...' : 'Marcar pagado'}
    </button>
  )
}
