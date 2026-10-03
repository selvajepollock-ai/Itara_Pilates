import { redirect } from 'next/navigation'

// Las clases sueltas ahora viven en el Registro diario, con el filtro de tipo "Clases sueltas".
export default async function SueltasRedirect({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; q?: string }>
}) {
  const sp = await searchParams
  const qs = new URLSearchParams({ tipo: 'sueltas' })
  if (sp.from && /^\d{4}-\d{2}/.test(sp.from)) qs.set('mes', sp.from.slice(0, 7))
  if (sp.q) qs.set('q', sp.q)
  redirect(`/admin/pagos/registro?${qs.toString()}`)
}
