import type { HabitStats, OccurrenceStatus } from './types'

export type DayAgg = 'confirmed' | 'missed' | 'pending' | null

function formatDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Agrega o historico (que pode ter mais de uma ocorrencia por dia, ex:
 * remedio de manha + noite) num status por dia:
 *   - todas confirmadas -> confirmed
 *   - alguma perdida -> missed (tem prioridade, e o que mais importa ver)
 *   - resto (pendente/notificado) -> pending
 *   - sem nenhuma ocorrencia naquele dia -> null (celula "apagada")
 *
 * As datas de `scheduled_at` vem do backend como hora local ingenua (sem
 * timezone), entao comparamos pelos primeiros 10 caracteres (YYYY-MM-DD) em
 * vez de reconstruir um Date -- evita reinterpretacao de fuso no navegador.
 */
export function buildHeatmapDays(history: HabitStats['history'], weeks = 18) {
  const byDate = new Map<string, OccurrenceStatus[]>()
  for (const h of history) {
    const key = h.scheduled_at.slice(0, 10)
    if (!byDate.has(key)) byDate.set(key, [])
    byDate.get(key)!.push(h.status)
  }

  const totalDays = weeks * 7
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: { key: string; agg: DayAgg }[] = []
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = formatDateKey(d)
    const statuses = byDate.get(key)

    let agg: DayAgg = null
    if (statuses && statuses.length) {
      if (statuses.every((s) => s === 'confirmed')) agg = 'confirmed'
      else if (statuses.some((s) => s === 'missed')) agg = 'missed'
      else agg = 'pending'
    }
    days.push({ key, agg })
  }
  return days
}
