import { useMemo } from 'react'
import { buildHeatmapDays } from '../lib/heatmap'
import type { HabitStats } from '../lib/types'

export default function Heatmap({ history }: { history: HabitStats['history'] }) {
  const days = useMemo(() => buildHeatmapDays(history), [history])

  return (
    <div className="overflow-x-auto pb-0.5">
      <div
        className="grid w-max gap-[3px]"
        style={{ gridAutoFlow: 'column', gridTemplateRows: 'repeat(7, 11px)' }}
      >
        {days.map((day, i) => (
          <div
            key={day.key}
            className={`heatmap-cell ${day.agg ? `heatmap-cell-${day.agg}` : 'heatmap-cell-future'}`}
            style={{ animationDelay: `${i * 2}ms` }}
            title={day.key}
          />
        ))}
      </div>
    </div>
  )
}
