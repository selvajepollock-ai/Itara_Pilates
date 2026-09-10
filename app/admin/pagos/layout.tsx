import { PagosNav } from './pagos-nav'

export default function PagosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.25em] text-moss">Estudio</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Pagos</h1>
      <PagosNav />
      <div className="mt-6">{children}</div>
    </div>
  )
}
