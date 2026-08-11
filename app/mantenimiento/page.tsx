export default function MantenimientoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-emblem.png" alt="Itara Pilates" className="h-16 w-16 object-contain" />
      <p className="mt-4 text-xs uppercase tracking-[0.3em] text-moss">Itara Pilates</p>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mantenimiento.gif"
        alt=""
        className="mt-8 h-48 w-auto"
      />

      <h1 className="mt-8 font-display text-3xl italic text-ink">
        Estamos preparando algo lindo
      </h1>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink/60">
        La app está en mantenimiento. Volvemos pronto con todo listo.
      </p>
      <p className="mt-6 text-xs italic text-ink/30">Nos vemos en la sala 🤍</p>
    </main>
  )
}
