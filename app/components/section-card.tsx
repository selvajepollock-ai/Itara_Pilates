/** Tarjeta de sección con título serif itálico, contador y acción opcionales. */
export function SectionCard({
  title,
  count,
  action,
  children,
  className = '',
}: {
  title: string
  count?: number
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`surface-card p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-[22px] font-normal italic leading-tight text-ink">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-edge-divider px-2 py-0.5 font-sans text-xs font-medium not-italic tabular-nums text-muted">
              {count}
            </span>
          )}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}
