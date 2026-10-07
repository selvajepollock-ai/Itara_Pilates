import { redirect } from 'next/navigation'

// La vista "Lista" pasó a ser la pestaña "Clases" de Horarios.
export default function ListaRedirect() {
  redirect('/admin/horarios?vista=clases')
}
