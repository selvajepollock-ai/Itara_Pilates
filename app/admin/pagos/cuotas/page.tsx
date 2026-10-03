import { redirect } from 'next/navigation'

// Las cuotas ahora viven en el Registro diario, con el filtro de tipo "Cuotas".
export default async function CuotasRedirect({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; q?: string; anuladas?: string }>
}) {
  const sp = await searchParams
  const qs = new URLSearchParams({ tipo: 'cuotas' })
  if (sp.from && /^\d{4}-\d{2}/.test(sp.from)) qs.set('mes', sp.from.slice(0, 7))
  if (sp.q) qs.set('q', sp.q)
  if (sp.anuladas === '1') qs.set('anulados', '1')
  redirect(`/admin/pagos/registro?${qs.toString()}`)
}
