// 5 combinaciones fijas (fondo, texto); el color se deriva del nombre para que
// cada persona siempre tenga el mismo.
const PALETTES: [string, string][] = [
  ['#E4ECE5', '#2F4A36'],
  ['#F3E6DB', '#7A4429'],
  ['#E2ECF5', '#255377'],
  ['#EFE6DA', '#6E4A30'],
  ['#EDE6F1', '#5B3F72'],
]

export function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'
  )
}

function paletteFor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return PALETTES[hash % PALETTES.length]
}

/** Círculo con iniciales. Decorativo: el nombre siempre va escrito al lado. */
export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const [bg, fg] = paletteFor(name)
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.35), background: bg, color: fg }}
    >
      {initialsOf(name)}
    </span>
  )
}
