import type { HabitType } from './types'

export const typeLabels: Record<HabitType, string> = {
  medication: 'Medicação',
  gym: 'Treinos',
  custom: 'Personalizado',
}

export const typeIcons: Record<HabitType, string> = {
  medication: '💊',
  gym: '🏋️',
  custom: '✳️',
}

/** "2026-09-09T09:01:07.624147" (hora local ingenua, ver backend/app/jobs/tick.py) -> "09/09 09:01" */
export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month} ${hh}:${mm}`
}

export function formatHM(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Checagem local (instantanea, sem round-trip) espelhando a trava do
 * backend (`_ensure_not_too_early` em backend/app/routers/occurrences.py).
 * `time` e sempre de hoje, ja que vem de GET /api/occurrences/today. */
export function isTooEarlyToConfirm(guardHours: number, time: string): boolean {
  if (guardHours <= 0) return false
  const [h, m] = time.split(':').map(Number)
  const scheduled = new Date()
  scheduled.setHours(h, m, 0, 0)
  const earliest = new Date(scheduled.getTime() - guardHours * 3600_000)
  return new Date() < earliest
}

const dayAbbr = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']

export function daysToText(days: number[] | null): string {
  if (!days || days.length === 0 || days.length === 7) return 'todo dia'
  return [...days]
    .sort((a, b) => a - b)
    .map((d) => dayAbbr[d])
    .join(', ')
}
