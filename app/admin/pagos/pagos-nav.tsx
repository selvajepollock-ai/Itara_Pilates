'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/admin/pagos', label: 'Resumen', exact: true },
  { href: '/admin/pagos/registro', label: 'Registro diario', exact: false },
  { href: '/admin/pagos/liquidacion', label: 'Liquidación', exact: false },
]

/** Pestañas: control segmentado en celular, subrayado en escritorio. */
export function PagosNav() {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Secciones de Pagos"
      className="mt-4 flex gap-1 rounded-[12px] bg-edge-row p-1 lg:mt-5 lg:gap-6 lg:rounded-none lg:border-b lg:border-edge lg:bg-transparent lg:p-0"
    >
      {TABS.map(({ href, label, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-[40px] flex-1 items-center justify-center whitespace-nowrap rounded-[9px] px-3 text-sm lg:-mb-px lg:flex-none lg:justify-start lg:rounded-none lg:border-b-2 lg:px-1 ${
              active
                ? 'bg-white font-semibold text-ink shadow-sm lg:border-moss lg:shadow-none'
                : 'text-muted hover:text-ink lg:border-transparent'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
