import { Megaphone } from 'lucide-react'

/** Tarjeta de un aviso, tal como se ve en el panel del alumno e instructor (también se usa en la vista previa de Comunicados). */
export function AnnouncementCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-2xl border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-ink">
      <Megaphone size={16} className="mt-0.5 shrink-0 text-clay" />
      <p>{message}</p>
    </div>
  )
}
