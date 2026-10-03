import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatARS } from '@/lib/currency'
import { buildReparto, COMMISSION_RATE } from '@/lib/reparto'
import { StatCard } from '@/app/components/stat-card'
import { ProgressBar } from '@/app/components/progress-bar'
import { todayART } from '../../horarios/slots'
import { ExportButton } from '../export-button'
import { MonthPicker, monthLabel } from '../month-picker'
import { Private } from '../privacy'
import { ExplainToggle } from './explain'
import { TeacherCard } from './teacher-card'

export default async function LiquidacionPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const { month: monthParam } = await searchParams
  const currentMonth = todayART().slice(0, 7)
  const month = /^\d{4}-\d{2}$/.test(monthParam ?? '') ? (monthParam as string) : currentMonth
  const supabase = await createClient()
  const reparto = await buildReparto(supabase, month)

  const pct = Math.round(COMMISSION_RATE * 100)

  const exportRows: Record<string, string | number>[] = []
  for (const g of reparto.groups) {
    for (const s of g.students) {
      exportRows.push({
        Profesor: g.name,
        Alumno: s.name,
        Plan: s.planName,
        Asignado: s.assigned,
        Cobrado: s.collected,
        [`Comisión ${pct}% s/asignado`]: g.isOwner || g.key === 'none' ? 0 : Math.round(s.assigned * COMMISSION_RATE * 100) / 100,
        [`Comisión ${pct}% s/cobrado`]: g.isOwner || g.key === 'none' ? 0 : Math.round(s.collected * COMMISSION_RATE * 100) / 100,
      })
    }
    exportRows.push({
      Profesor: g.name,
      Alumno: 'TOTAL',
      Plan: '',
      Asignado: g.assigned,
      Cobrado: g.collected,
      [`Comisión ${pct}% s/asignado`]: g.commissionAssigned,
      [`Comisión ${pct}% s/cobrado`]: g.commissionCollected,
    })
  }

  const toTeachers = reparto.groups.reduce((a, g) => a + g.commissionCollected, 0)
  const teacherNames = reparto.groups.filter((g) => g.key !== 'none' && !g.isOwner && g.students.length > 0).map((g) => g.name)
  const collectedPct = reparto.totalAssigned > 0 ? (reparto.totalCollected / reparto.totalAssigned) * 100 : 0
  const groups = reparto.groups.filter((g) => g.students.length > 0 || g.payouts.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl italic text-ink">{monthLabel(month)}</h2>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker param="month" value={month} currentMonth={currentMonth} />
          <ExportButton filename={`liquidacion-${month}`} sheetName="Liquidacion" title={`Liquidación ${month}`} rows={exportRows} />
        </div>
      </div>

      {reparto.withoutInstructor > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-slot-freed-edge bg-slot-freed-soft px-5 py-4 text-sm text-slot-freed-ink">
          <AlertTriangle size={16} className="shrink-0" aria-hidden />
          <p className="min-w-0 flex-1">
            <span className="font-semibold">
              {reparto.withoutInstructor} alumno{reparto.withoutInstructor === 1 ? '' : 's'} sin profesor asignado.
            </span>{' '}
            No suman a ningún profesor hasta que tengan horarios fijos.
          </p>
          <Link
            href="/admin/alumnos?profesor=sin"
            className="inline-flex h-[34px] items-center rounded-[10px] border border-slot-freed-edge bg-white px-3 text-[13px] font-semibold text-slot-freed-ink hover:border-moss"
          >
            Asignar profesor →
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Cobrado en el mes"
          value={<Private mask="$ ••••••">{formatARS(reparto.totalCollected)}</Private>}
          href={`/admin/pagos/registro?mes=${month}`}
          hint={
            <>
              de <Private mask="$ ••••••">{formatARS(reparto.totalAssigned)}</Private> asignado · {Math.round(collectedPct)}%
            </>
          }
        >
          <ProgressBar value={collectedPct} label="Cobrado sobre lo asignado" />
        </StatCard>
        <StatCard
          label="A pagar a profesores"
          value={
            <span className="text-danger-ink">
              <Private mask="$ ••••••">{formatARS(toTeachers)}</Private>
            </span>
          }
          href="#por-profesor"
          hint={`${pct}% de lo cobrado de ${teacherNames.length > 0 ? teacherNames.join(' y ') : 'los profesores'}`}
        />
        <StatCard
          label="Queda para el estudio"
          value={<Private mask="$ ••••••">{formatARS(reparto.studioCollected)}</Private>}
          href="#por-profesor"
          hint={
            <>
              <Private mask="$ ••••••">{formatARS(reparto.studioAssigned)}</Private> si pagaran todos
            </>
          }
        />
      </div>

      <section id="por-profesor" className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-[22px] italic text-ink">Por profesor</h2>
          <ExplainToggle>
            Comisión = {pct}% del valor. &quot;Asignado&quot; es el precio del plan más cargos extra del mes; &quot;cobrado&quot; es lo
            que efectivamente entró (por fecha de pago). Los bonificados no suman. A Rodri no se le calcula comisión. &quot;A
            pagar&quot; es la comisión sobre lo cobrado menos lo ya pagado.
          </ExplainToggle>
        </div>

        {groups.map((g) => (
          <TeacherCard
            key={g.key}
            group={g}
            month={month}
            defaultOpen={g.key !== 'none' && !g.isOwner && Math.max(g.commissionCollected - g.paid, 0) > 0}
          />
        ))}
      </section>
    </div>
  )
}
