import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { NewHolidayForm } from './new-holiday-form'
import { DeleteHolidayButton } from './delete-holiday-button'

export default async function FeriadosPage() {
  const supabase = await createClient()
  const { data: holidays } = await supabase
    .from('holidays')
    .select('id, date, label')
    .order('date', { ascending: true })

  return (
    <div className="max-w-lg">
      <Link href="/admin/horarios" className="text-sm text-moss hover:text-moss-dark">
        ← Volver al calendario
      </Link>

      <p className="mt-4 text-xs uppercase tracking-[0.25em] text-moss">Horarios</p>
      <h1 className="mt-2 font-display text-3xl italic text-ink">Feriados y días sin clase</h1>
      <p className="mt-2 text-sm text-ink/60">
        Ese día, el calendario va a aparecer cerrado (no reemplaza cancelar una clase puntual).
      </p>

      <NewHolidayForm />

      <ul className="mt-6 divide-y divide-sand/60 rounded-2xl border border-sand bg-white">
        {holidays?.map((h) => (
          <li key={h.id} className="flex items-center justify-between px-5 py-4">
            <div>
              <p className="font-display italic text-ink">
                {new Date(`${h.date}T00:00:00`).toLocaleDateString('es-AR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {h.label && <p className="mt-0.5 text-sm text-ink/50">{h.label}</p>}
            </div>
            <DeleteHolidayButton holidayId={h.id} />
          </li>
        ))}
        {(!holidays || holidays.length === 0) && (
          <li className="px-5 py-10 text-center text-sm text-ink/40">
            No hay feriados cargados todavía.
          </li>
        )}
      </ul>
    </div>
  )
}
