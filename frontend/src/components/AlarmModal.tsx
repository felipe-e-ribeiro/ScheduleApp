import { useEffect } from 'react'
import { playAlarmBeep } from '../lib/alarm'

interface Props {
  habitName: string
  nowLabel: string
  scheduledLabel: string
  guardHours: number
  onClose: () => void
}

export default function AlarmModal({ habitName, nowLabel, scheduledLabel, guardHours, onClose }: Props) {
  useEffect(() => {
    playAlarmBeep()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center p-5"
      style={{ background: 'rgba(20,4,4,.75)', backdropFilter: 'blur(3px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="panel alarm-flash w-full max-w-[380px] p-8 text-center">
        <span className="rivet rivet-tl" />
        <span className="rivet rivet-tr" />
        <span className="rivet rivet-bl" />
        <span className="rivet rivet-br" />

        <div className="mb-3 text-[42px]">🚨</div>
        <div className="font-display mb-3 text-[28px] font-black tracking-wide" style={{ color: 'var(--red)' }}>
          MUITO CEDO
        </div>
        <div className="mb-1.5 text-sm" style={{ color: 'var(--text)' }}>
          Agora são <b>{nowLabel}</b>.
        </div>
        <div className="mb-2 text-sm leading-relaxed" style={{ color: 'var(--text-dim)' }}>
          Você deveria consumir <b style={{ color: 'var(--text)' }}>{habitName}</b> apenas às{' '}
          <b style={{ color: 'var(--amber)' }}>{scheduledLabel}</b>.
        </div>
        <div className="mb-6 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          trava configurada: {guardHours}h de antecedência
        </div>

        <button onClick={onClose} className="btn btn-primary w-full">
          Entendi
        </button>
      </div>
    </div>
  )
}
