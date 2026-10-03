import { AnnouncementCard } from '@/app/components/announcement-card'

/** Marco de celular con una versión simplificada del panel del alumno. Decorativo: repite el texto del mensaje. */
export function AnnouncementPreview({ message }: { message: string }) {
  const text = message.trim()
  return (
    <div aria-hidden>
      <div className="mx-auto w-[300px] rounded-[36px] border-[10px] border-ink bg-white p-4 pb-6">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-edge-strong" />
        <p className="font-display text-xl italic text-ink">Hola, Ana</p>
        <p className="mb-3 text-xs text-muted">Tu panel</p>
        {text ? (
          <AnnouncementCard message={text} />
        ) : (
          <p className="rounded-2xl border border-dashed border-edge-strong px-4 py-3 text-sm italic text-muted">
            Escribí el mensaje para ver cómo queda.
          </p>
        )}
        <div className="mt-3 space-y-2">
          <div className="h-14 rounded-2xl bg-edge-head" />
          <div className="h-14 rounded-2xl bg-edge-head" />
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted">Vista aproximada del panel del alumno</p>
    </div>
  )
}
