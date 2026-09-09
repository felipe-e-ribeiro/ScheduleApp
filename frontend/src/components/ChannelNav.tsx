import { NavLink } from 'react-router-dom'

interface Props {
  medicationCount: number
  gymCount: number
}

export default function ChannelNav({ medicationCount, gymCount }: Props) {
  return (
    <div className="mb-6 flex gap-3">
      <ChannelButton to="/medicacao" icon="💊" name="Medicação" count={medicationCount} />
      <ChannelButton to="/treinos" icon="🏋️" name="Treinos" count={gymCount} />
    </div>
  )
}

function ChannelButton({ to, icon, name, count }: { to: string; icon: string; name: string; count: number }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-1 items-center gap-3.5 rounded-xl border px-4 py-4 text-left transition-colors ${
          isActive ? '' : 'hover:border-[var(--border-bright)]'
        }`
      }
      style={({ isActive }) => ({
        borderColor: isActive ? 'var(--amber)' : 'var(--border)',
        background: 'var(--panel)',
        boxShadow: isActive ? '0 0 0 1px var(--amber) inset, 0 0 24px -8px var(--amber-glow)' : 'none',
      })}
    >
      {({ isActive }) => (
        <>
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] border text-[19px]"
            style={{
              background: isActive ? 'var(--amber-dim)' : '#0f0d07',
              borderColor: isActive ? 'var(--amber)' : 'var(--border)',
            }}
          >
            {icon}
          </div>
          <div>
            <div className="font-display text-[17px] font-extrabold">{name}</div>
            <div
              className="mt-0.5 text-[10px] uppercase tracking-wider"
              style={{ color: isActive ? 'var(--amber)' : 'var(--text-faint)' }}
            >
              {count} {count === 1 ? 'ativo' : 'ativos'}
            </div>
          </div>
        </>
      )}
    </NavLink>
  )
}
