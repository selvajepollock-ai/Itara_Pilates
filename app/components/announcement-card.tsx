/** Aviso del estudio, tal como se ve en el panel del alumno e instructor (y en la vista previa de Comunicados). */
export function AnnouncementCard({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-2xl border border-edge border-l-4 border-l-[#C9962E] bg-white py-3 pl-4 pr-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-warning-ink">Aviso del estudio</p>
        <p className="mt-1 text-sm leading-snug text-ink">{message}</p>
      </div>
      {action}
    </div>
  )
}
