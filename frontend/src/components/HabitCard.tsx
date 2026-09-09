import { useCallback, useEffect, useState } from 'react'
import * as api from '../lib/api'
import { useToast } from '../context/ToastContext'
import { daysToText, formatDateTime } from '../lib/format'
import type { Habit, HabitStats, TodayOccurrence } from '../lib/types'
import Heatmap from './Heatmap'
import CountUp from './CountUp'

interface Props {
  habit: Habit
  todayOccurrences: TodayOccurrence[]
  onEdit: () => void
  onReactivate: () => void
  onTodayChanged: () => void
}

export default function HabitCard({ habit, todayOccurrences, onEdit, onReactivate, onTodayChanged }: Props) {
  const { showToast } = useToast()
  const [stats, setStats] = useState<HabitStats | null>(null)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())

  const loadStats = useCallback(() => {
    if (!habit.active) return
    api.getHabitStats(habit.id).then(setStats).catch(() => {})
  }, [habit.id, habit.active])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  async function handlePillClick(occ: TodayOccurrence) {
    if (occ.status === 'confirmed' || pendingIds.has(occ.id)) return
    setPendingIds((prev) => new Set(prev).add(occ.id))
    try {
      await api.confirmOccurrenceAdmin(occ.id)
      onTodayChanged()
      loadStats()
      showToast(
        <>
          <b style={{ color: 'var(--green)' }}>
            {habit.name} {occ.time}
          </b>{' '}
          confirmado
        </>,
        async () => {
          await api.unconfirmOccurrenceAdmin(occ.id)
          onTodayChanged()
          loadStats()
        },
      )
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(occ.id)
        return next
      })
    }
  }

  if (!habit.active) {
    return (
      <article className="panel animate-fade-up p-6">
        <span className="rivet rivet-tl" />
        <span className="rivet rivet-tr" />
        <span className="rivet rivet-bl" />
        <span className="rivet rivet-br" />
        <div className="mb-4 font-display text-2xl font-extrabold leading-none">{habit.name}</div>
        <div
          className="mb-2.5 inline-block rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-widest"
          style={{ color: 'var(--red)', borderColor: 'var(--red-dim)', background: 'rgba(255,92,92,.08)' }}
        >
          INATIVO
        </div>
        <div
          className="mb-4 rounded-md border px-3 py-2 text-[11px]"
          style={{ background: '#0f0d07', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
        >
          Hábito desativado — histórico preservado.
        </div>
        <button
          onClick={onReactivate}
          className="rounded-full border px-3 py-1.5 text-[10px] font-semibold tracking-wider"
          style={{ color: 'var(--green)', borderColor: 'var(--green-dim)' }}
        >
          Reativar
        </button>
      </article>
    )
  }

  const ledColor =
    todayOccurrences.length === 0 || todayOccurrences.every((o) => o.status === 'confirmed')
      ? 'var(--green)'
      : 'var(--amber)'

  const lastConfirmed = [...(stats?.history ?? [])].reverse().find((h) => h.confirmed_at)?.confirmed_at

  return (
    <article className="panel animate-fade-up p-6">
      <span className="rivet rivet-tl" />
      <span className="rivet rivet-tr" />
      <span className="rivet rivet-bl" />
      <span className="rivet rivet-br" />

      <div className="mb-4 flex items-start justify-between gap-2.5">
        <div>
          <div className="font-display text-2xl font-extrabold leading-none">{habit.name}</div>
          <div className="mt-1.5 text-[11px]" style={{ color: 'var(--text-dim)' }}>
            ⏰ <b style={{ color: 'var(--text)' }}>{habit.times.join(' · ') || '--'}</b> —{' '}
            {daysToText(habit.days_of_week)}
          </div>
        </div>
        <div className="flex flex-none flex-col items-end gap-2">
          <div
            className="h-[9px] w-[9px] rounded-full"
            style={{ background: ledColor, boxShadow: `0 0 10px ${ledColor}` }}
          />
          <button
            onClick={onEdit}
            title="Editar"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-md border text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--panel)', color: 'var(--text-dim)' }}
          >
            ⋮
          </button>
        </div>
      </div>

      <div className="mb-2 text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
        Hoje — toque pra confirmar sem esperar o telegram
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {todayOccurrences.length === 0 && (
          <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
            nada agendado hoje
          </span>
        )}
        {todayOccurrences.map((occ) => {
          const clickable = occ.status !== 'confirmed'
          const icon = occ.status === 'confirmed' ? '✓' : occ.status === 'missed' ? '!' : ''
          return (
            <button
              key={occ.id}
              type="button"
              disabled={!clickable || pendingIds.has(occ.id)}
              onClick={() => handlePillClick(occ)}
              className={`today-pill today-pill-${occ.status} ${clickable ? 'today-pill-actionable' : ''}`}
            >
              {occ.time} {icon}
            </button>
          )
        })}
      </div>

      <div className="mb-4 flex gap-5">
        <div>
          <div
            className="font-display text-[46px] font-black leading-none"
            style={{ color: 'var(--amber)', textShadow: '0 0 30px var(--amber-glow)' }}
          >
            {stats ? <CountUp value={stats.current_streak} /> : '—'}
            <small className="ml-1 font-mono text-[13px] font-semibold" style={{ color: 'var(--text-dim)' }}>
              dias
            </small>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
            Streak atual
          </div>
        </div>
        <div>
          <div
            className="font-display text-[46px] font-black leading-none"
            style={{ color: 'var(--green)', textShadow: '0 0 30px var(--green-glow)' }}
          >
            {stats?.adherence_pct != null ? <CountUp value={stats.adherence_pct} suffix="%" /> : '—'}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-faint)' }}>
            Aderência 90d
          </div>
        </div>
      </div>

      <div
        className="mb-4 rounded-md border px-3 py-2 text-[11px]"
        style={{ background: '#0f0d07', borderColor: 'var(--border)', color: 'var(--text-dim)' }}
      >
        Última confirmação:{' '}
        <b style={{ color: 'var(--text)' }}>{lastConfirmed ? formatDateTime(lastConfirmed) : 'nunca confirmado'}</b>
      </div>

      {stats ? <Heatmap history={stats.history} /> : <div className="skeleton h-[64px] w-full" />}

      <div className="mt-2.5 flex gap-3.5 text-[10px]" style={{ color: 'var(--text-faint)' }}>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--green)' }} /> confirmado
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--red)' }} /> perdido
        </span>
        <span className="inline-flex items-center gap-1">
          <i className="inline-block h-2 w-2 rounded-sm" style={{ background: 'var(--amber)' }} /> pendente
        </span>
      </div>
    </article>
  )
}
