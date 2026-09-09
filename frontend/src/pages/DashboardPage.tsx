import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import * as api from '../lib/api'
import TopNav from '../components/TopNav'
import ChannelNav from '../components/ChannelNav'
import HabitCard from '../components/HabitCard'
import HabitModal from '../components/HabitModal'
import { typeLabels } from '../lib/format'
import type { Habit, HabitType, TodayOccurrence } from '../lib/types'

const CATEGORY_TO_TYPE: Record<string, HabitType> = {
  medicacao: 'medication',
  treinos: 'gym',
}

export default function DashboardPage() {
  const { category } = useParams<{ category: string }>()
  const type = CATEGORY_TO_TYPE[category ?? ''] ?? 'medication'

  const [habits, setHabits] = useState<Habit[]>([])
  const [today, setToday] = useState<TodayOccurrence[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null })

  const load = useCallback(async () => {
    const [h, t] = await Promise.all([api.listHabits(), api.listToday()])
    setHabits(h)
    setToday(t)
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function handleReactivate(habit: Habit) {
    await api.updateHabit(habit.id, { active: true })
    load()
  }

  const pageHabits = habits.filter((h) => h.type === type)
  const medicationCount = habits.filter((h) => h.type === 'medication' && h.active).length
  const gymCount = habits.filter((h) => h.type === 'gym' && h.active).length

  return (
    <div className="mx-auto max-w-[920px] px-5 pb-20 pt-6">
      <TopNav />
      <ChannelNav medicationCount={medicationCount} gymCount={gymCount} />

      <div className="mb-4 flex items-baseline justify-between">
        <div className="font-display text-[22px] font-extrabold">{typeLabels[type]}</div>
        <div className="text-[11px] tracking-wider" style={{ color: 'var(--text-faint)' }}>
          {loading ? '…' : `${pageHabits.length} ${pageHabits.length === 1 ? 'hábito' : 'hábitos'}`}
        </div>
      </div>

      <div className="grid gap-[18px]" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(300px, 100%), 1fr))' }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            {pageHabits.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                todayOccurrences={today.filter((o) => o.habit_id === h.id)}
                onEdit={() => setModal({ open: true, habit: h })}
                onReactivate={() => handleReactivate(h)}
                onTodayChanged={load}
              />
            ))}
            <button
              onClick={() => setModal({ open: true, habit: null })}
              className="panel flex min-h-[200px] flex-col items-center justify-center gap-1.5 !bg-transparent transition-colors"
              style={{ border: '1.5px dashed var(--border-bright)' }}
            >
              <div className="font-display text-4xl leading-none" style={{ color: 'var(--amber)' }}>
                +
              </div>
              <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
                {type === 'medication' ? 'Nova medicação' : 'Novo treino'}
              </div>
            </button>
          </>
        )}
      </div>

      <div className="mt-16 text-center text-[10px] tracking-wide" style={{ color: 'var(--text-faint)' }}>
        PULSO · lembretes via telegram · confirmação manual
      </div>

      {modal.open && (
        <HabitModal
          type={type}
          habit={modal.habit}
          onClose={() => setModal({ open: false, habit: null })}
          onSaved={load}
        />
      )}
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="panel space-y-3.5 p-6">
      <div className="skeleton h-[22px] w-[55%]" />
      <div className="skeleton h-8 w-full rounded-full" />
      <div className="skeleton h-[46px] w-[90px]" />
      <div className="skeleton h-16 w-full" />
    </div>
  )
}
