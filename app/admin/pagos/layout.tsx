import { PagosNav } from './pagos-nav'

export default function PagosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow">Estudio</p>
      <h1 className="page-title mt-2">Pagos</h1>
      <PagosNav />
      <div className="mt-6">{children}</div>
    </div>
  )
}
