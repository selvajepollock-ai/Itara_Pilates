/** Teaser de la racha de asistencia: "Muy pronto". No calcula nada. */
export function StreakCard() {
  return (
    <section className="rounded-2xl border border-edge bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">Tu racha de asistencia</h2>
        <span className="rounded-full bg-[#2B2A26] px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">MUY PRONTO</span>
      </div>
      <div className="mt-3 flex gap-1" aria-hidden="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="h-2 flex-1 rounded-full bg-[#C9962E]/30" />
        ))}
      </div>
      <p className="mt-3 text-[13px] text-muted">La constancia también se entrena.</p>
    </section>
  )
}
