'use client'

export function WeekJumpInput({ defaultValue, showFuerza }: { defaultValue: string; showFuerza: boolean }) {
  return (
    <form action="/admin/horarios" method="GET" className="flex items-center">
      <input
        type="date"
        name="week"
        defaultValue={defaultValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-full border border-sand px-3 py-1.5 text-sm text-ink/70 outline-none focus:border-moss"
      />
      {showFuerza && <input type="hidden" name="fuerza" value="1" />}
    </form>
  )
}
