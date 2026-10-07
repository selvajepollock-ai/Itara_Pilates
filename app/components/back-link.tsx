import Link from 'next/link'

/**
 * Botón "Volver" estándar de las subpantallas: va arriba del título y lleva a la pantalla padre.
 * Escritorio y tablet: link "← {destino}". Celular: botón "‹" de 44×44.
 */
export function BackLink({ href, label, className = '' }: { href: string; label: string; className?: string }) {
  return (
    <div className={`mb-4 lg:mb-5 ${className}`}>
      <Link
        href={href}
        className="hidden text-sm font-medium text-moss hover:underline md:inline-block"
      >
        ← {label}
      </Link>
      <Link
        href={href}
        aria-label={`Volver a ${label}`}
        className="flex h-11 w-11 items-center justify-center rounded-[12px] border border-edge-strong bg-white text-xl leading-none text-ink md:hidden"
      >
        ‹
      </Link>
    </div>
  )
}
