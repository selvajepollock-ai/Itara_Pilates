/** Aviso del estudio, tal como se ve en el panel del alumno e instructor (y en la vista previa de Comunicados). */
export function AnnouncementCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-edge border-l-4 border-l-[#C9962E] bg-white px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-warning-ink">Aviso del estudio</p>
      <p className="mt-1 text-sm leading-snug text-ink">{message}</p>
    </div>
  )
}
