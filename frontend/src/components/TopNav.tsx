import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function TopNav() {
  const { logout, isAdmin } = useAuth()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="mb-7 flex flex-wrap items-center justify-between gap-y-3 border-b pb-[18px]"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-baseline gap-2.5">
        <div
          className="font-display text-[30px] font-extrabold"
          style={{ textShadow: '0 0 24px var(--amber-glow)' }}
        >
          PUL<span style={{ color: 'var(--amber)' }}>·</span>SO
        </div>
        <div className="text-[10px] uppercase tracking-[.18em]" style={{ color: 'var(--text-faint)' }}>
          painel de aderência
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 text-[11px] tracking-wider" style={{ color: 'var(--text-dim)' }}>
        <span
          className="h-[7px] w-[7px] animate-pulse-dot rounded-full"
          style={{ background: 'var(--green)', boxShadow: '0 0 8px var(--green-glow)' }}
        />
        <span>SISTEMA ONLINE</span>
        <span className="tabular-nums" style={{ color: 'var(--text)' }}>
          {now.toLocaleTimeString('pt-BR', { hour12: false })}
        </span>
        {isAdmin && (
          <Link
            to="/usuarios"
            className="rounded-full border px-2.5 py-1.5 text-[10px] uppercase tracking-wider transition-colors hover:text-[var(--amber)]"
            style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}
          >
            👤 Usuários
          </Link>
        )}
        <button
          onClick={() => logout()}
          className="rounded-full border px-2.5 py-1.5 text-[10px] uppercase tracking-wider transition-colors hover:text-[var(--red)]"
          style={{ borderColor: 'var(--border)', color: 'var(--text-faint)' }}
        >
          ⏻ Sair
        </button>
      </div>
    </div>
  )
}
