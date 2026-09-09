import { useEffect, useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import { typeIcons, typeLabels } from '../lib/format'
import type { Habit, HabitType } from '../lib/types'

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]
const DAY_LABELS = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM']

interface Props {
  type: HabitType
  habit: Habit | null // null = criando um novo
  onClose: () => void
  onSaved: () => void
}

export default function HabitModal({ type, habit, onClose, onSaved }: Props) {
  const isEdit = habit != null
  const effectiveType = habit?.type ?? type

  const [name, setName] = useState(habit?.name ?? '')
  const [times, setTimes] = useState<string[]>(habit?.times ?? [])
  const [timeInput, setTimeInput] = useState('')
  const [days, setDays] = useState<Set<number>>(new Set(habit?.days_of_week?.length ? habit.days_of_week : ALL_DAYS))
  const [retryInterval, setRetryInterval] = useState(habit?.retry_interval_min ?? 60)
  const [maxRetries, setMaxRetries] = useState(habit?.max_retries ?? 3)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function addTime() {
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(timeInput) && !times.includes(timeInput)) {
      setTimes([...times, timeInput].sort())
      setTimeInput('')
    }
  }
  function removeTime(t: string) {
    setTimes(times.filter((x) => x !== t))
  }
  function toggleDay(d: number) {
    setDays((prev) => {
      const next = new Set(prev)
      if (next.has(d)) next.delete(d)
      else next.add(d)
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Dê um nome pro hábito.')
      return
    }
    if (times.length === 0) {
      setError('Adicione ao menos um horário.')
      return
    }
    setError('')
    setSaving(true)
    const payload = {
      name: name.trim(),
      type: effectiveType,
      times,
      days_of_week: days.size === 7 ? null : Array.from(days).sort(),
      retry_interval_min: retryInterval,
      max_retries: maxRetries,
    }
    try {
      if (isEdit) {
        await api.updateHabit(habit.id, payload)
      } else {
        await api.createHabit(payload)
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!habit) return
    setSaving(true)
    try {
      await api.deactivateHabit(habit.id)
      onSaved()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-5"
      style={{ background: 'rgba(8,7,4,.72)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="panel animate-fade-up max-h-[88vh] w-full max-w-[440px] overflow-y-auto p-6 text-left">
        <span className="rivet rivet-tl" />
        <span className="rivet rivet-tr" />
        <span className="rivet rivet-bl" />
        <span className="rivet rivet-br" />

        <div className="mb-5 flex items-center justify-between">
          <div className="font-display text-xl font-extrabold">{isEdit ? 'Editar hábito' : 'Novo hábito'}</div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border text-[15px]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          >
            ×
          </button>
        </div>

        <div
          className="mb-[18px] inline-block rounded-full border px-2.5 py-1.5 text-[11px] font-semibold tracking-wider"
          style={{ color: 'var(--amber)', background: 'var(--amber-dim)', borderColor: 'var(--amber)' }}
        >
          {typeIcons[effectiveType]} {typeLabels[effectiveType]}
        </div>

        <Field label="Nome">
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Remédio X"
            autoFocus
          />
        </Field>

        <Field label="Horários">
          <div className="mb-2.5 flex gap-2">
            <input
              type="time"
              className="field-input flex-1"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
            />
            <button
              type="button"
              onClick={addTime}
              className="w-11 flex-none rounded-lg border text-lg"
              style={{ borderColor: 'var(--border-bright)', background: 'var(--panel-raised)', color: 'var(--amber)' }}
            >
              +
            </button>
          </div>
          <div className="flex min-h-[22px] flex-wrap gap-1.5">
            {times.length === 0 && (
              <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                nenhum horário adicionado
              </span>
            )}
            {times.map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border py-1.5 pl-2.5 pr-1.5 font-mono text-xs"
                style={{ borderColor: 'var(--border-bright)', background: 'var(--panel)', color: 'var(--amber)' }}
              >
                {t}
                <button
                  type="button"
                  onClick={() => removeTime(t)}
                  className="text-sm leading-none"
                  style={{ color: 'var(--text-faint)' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </Field>

        <Field label="Dias da semana">
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleDay(i)}
                className="h-9 flex-1 rounded-md border text-[10px] font-bold"
                style={
                  days.has(i)
                    ? { background: 'var(--amber-dim)', borderColor: 'var(--amber)', color: 'var(--amber)' }
                    : { background: '#0f0d07', borderColor: 'var(--border)', color: 'var(--text-faint)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <Field label="Reforço (min)">
            <input
              type="number"
              min={5}
              step={5}
              className="field-input"
              value={retryInterval}
              onChange={(e) => setRetryInterval(Number(e.target.value))}
            />
          </Field>
          <Field label="Máx. tentativas">
            <input
              type="number"
              min={1}
              max={10}
              className="field-input"
              value={maxRetries}
              onChange={(e) => setMaxRetries(Number(e.target.value))}
            />
          </Field>
        </div>

        <div className="mb-1.5 min-h-[14px] text-[11px]" style={{ color: 'var(--red)' }}>
          {error}
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2.5">
          {isEdit ? (
            <button onClick={handleDelete} disabled={saving} className="btn btn-danger">
              Excluir
            </button>
          ) : (
            <span />
          )}
          <div className="ml-auto flex gap-2.5">
            <button onClick={onClose} className="btn btn-ghost">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="btn btn-primary">
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
