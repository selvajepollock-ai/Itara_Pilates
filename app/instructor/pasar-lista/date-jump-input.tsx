'use client'

export function DateJumpInput({ defaultValue }: { defaultValue: string }) {
  return (
    <form action="/instructor/pasar-lista" method="GET">
      <input
        type="date"
        name="date"
        defaultValue={defaultValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-full border border-sand px-3 py-1.5 text-sm text-ink/70 outline-none focus:border-moss"
      />
    </form>
  )
}
