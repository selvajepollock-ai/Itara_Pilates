/** Encabezado de pantalla: fecha chica arriba, título serif y acciones a la derecha. */
export function PageHeader({
  eyebrow,
  title,
  actions,
}: {
  eyebrow?: string
  title: string
  actions?: React.ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="text-sm text-muted first-letter:uppercase">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-[38px] font-normal italic leading-tight text-ink">{title}</h1>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </header>
  )
}
