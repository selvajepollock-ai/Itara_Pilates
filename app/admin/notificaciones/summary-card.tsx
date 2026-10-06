/** Resumen de lo que se va a publicar: para quién, hasta cuándo y si lleva ventana emergente. */
export function SummaryCard({
  to,
  until,
  urgent,
  children,
}: {
  to: string
  until: string
  urgent: boolean
  /** Botones (Publicar / Descartar): solo en escritorio. */
  children?: React.ReactNode
}) {
  const row = (label: string, value: string) => (
    <div className="flex justify-between gap-3 text-[13.5px]">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium text-ink">{value}</dd>
    </div>
  )
  return (
    <section className="space-y-2.5 rounded-2xl border border-edge p-4">
      <h3 className="text-[13px] font-semibold text-ink">Resumen</h3>
      <dl className="space-y-2.5">
        {row('Para', to)}
        {row('Se ve', until)}
        {row('Ventana emergente', urgent ? 'Sí' : 'No')}
      </dl>
      {children}
    </section>
  )
}
