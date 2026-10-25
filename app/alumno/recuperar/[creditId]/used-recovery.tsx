import Link from 'next/link'
import { isInPast } from '@/lib/sessions'
import { formatTime } from '@/lib/day-names'
import { dayDate } from '../../format'

export type UsedRecovery = { label: string; past: boolean }

/** Si la recuperación ya se usó en una clase: "el jueves 30 a las 18:00" y si esa clase ya pasó. */
export function usedRecoveryOf(credit: {
  status: string
  used_session_date: string | null
  used: unknown
}): UsedRecovery | null {
  const used = credit.used as { start_time: string } | null
  if (credit.status !== 'used' || !credit.used_session_date || !used) return null
  return {
    label: `el ${dayDate(credit.used_session_date)} a las ${formatTime(used.start_time)}`,
    past: isInPast(credit.used_session_date, used.start_time),
  }
}

/** Mensaje cuando la recuperación ya no se puede elegir: usada en una clase o vencida. */
export function closedRecoveryText(credit: { status: string }) {
  return credit.status === 'expired' ? 'Esta recuperación venció.' : 'Esta recuperación ya fue usada.'
}

/** Tarjeta de "Confirmada": se ve al confirmar y también si se vuelve a entrar a la recuperación ya usada. */
export function UsedRecoveryCard({
  label,
  past = false,
  forAdmin = false,
  backHref,
  backLabel,
}: {
  label: string
  past?: boolean
  forAdmin?: boolean
  backHref: string
  backLabel: string
}) {
  return (
    <div className="rounded-2xl border border-[#DCE7DE] bg-moss-soft p-6">
      <span className="rounded-full bg-slot-free px-2.5 py-0.5 text-[11px] font-semibold text-slot-free-ink">
        {past ? 'Usada' : 'Confirmada'}
      </span>
      <p className="mt-3 font-display text-2xl italic text-ink">
        {past
          ? `${forAdmin ? 'Usó' : 'Usaste'} esta recuperación ${label}`
          : forAdmin
            ? `Recuperación confirmada para ${label}`
            : `Listo, te esperamos ${label}`}
      </p>
      {!past && (
        <p className="mt-2 text-sm text-muted">
          {forAdmin
            ? 'Ya quedó anotada en esa clase.'
            : 'Tu recuperación quedó confirmada. La vas a ver en "Tus clases". Si no podés ir, avisá con tiempo desde tu panel.'}
        </p>
      )}
      <Link
        href={backHref}
        className="mt-5 inline-flex h-11 items-center justify-center rounded-[12px] bg-[#2B2A26] px-5 text-sm font-semibold text-white hover:bg-black max-sm:w-full"
      >
        {backLabel}
      </Link>
    </div>
  )
}
