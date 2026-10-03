/** Saludo con la fecha, el nombre y la frase del día. Los círculos que respiran son decorativos. */
export function Greeting({ dateText, firstName, quote }: { dateText: string; firstName: string | null; quote: string }) {
  return (
    <section className="relative overflow-hidden rounded-[22px] bg-[linear-gradient(150deg,#F7EFE5_0%,#EEF3EE_100%)] p-6 lg:rounded-3xl lg:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-8 h-44 w-44">
        <div className="itara-breath2 absolute inset-0 rounded-full bg-moss/[0.10]" />
        <div className="itara-breath absolute inset-7 rounded-full bg-moss/[0.16]" />
      </div>
      <div className="relative">
        <p className="text-sm text-muted">{dateText}</p>
        <h1 className="mt-1 font-display text-[34px] font-normal italic leading-tight text-ink lg:text-[46px]">
          {firstName ? `Hola, ${firstName}` : 'Tu horario'}
        </h1>
        <div className="mt-5 border-l-[3px] border-[#C9A27A] pl-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8A5A3C]">Frase del día</p>
          <p className="mt-1 font-display text-[19px] italic leading-snug text-ink lg:text-2xl">{quote}</p>
        </div>
      </div>
    </section>
  )
}
