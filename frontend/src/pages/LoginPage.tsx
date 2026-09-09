import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'

export default function LoginPage() {
  const { status, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [unlocked, setUnlocked] = useState(false)

  if (status === 'authenticated') {
    const from = (location.state as { from?: string } | null)?.from ?? '/medicacao'
    return <Navigate to={from} replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await login(username, password)
      setUnlocked(true)
      setTimeout(() => navigate('/medicacao', { replace: true }), 350)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível entrar.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center pt-[6vh]">
      <div className="panel w-full max-w-[340px] p-9 pb-8 text-center">
        <span className="rivet rivet-tl" />
        <span className="rivet rivet-tr" />
        <span className="rivet rivet-bl" />
        <span className="rivet rivet-br" />

        <div
          className="relative mx-auto mb-[18px] flex h-11 w-11 items-center justify-center rounded-full border"
          style={{ background: 'radial-gradient(circle at 35% 30%, #3a3220, #1a1608)', borderColor: 'var(--border-bright)' }}
        >
          <span
            className={`h-3.5 w-3.5 rounded-full ${unlocked ? '' : 'animate-blink'}`}
            style={{
              background: unlocked ? 'var(--green)' : 'var(--amber)',
              boxShadow: `0 0 18px 4px ${unlocked ? 'var(--green-glow)' : 'var(--amber-glow)'}`,
            }}
          />
        </div>
        <div className="font-display text-[22px] font-extrabold">PULSO</div>
        <div className="mb-6 text-[11px] tracking-wide" style={{ color: 'var(--text-faint)' }}>
          ACESSO RESTRITO
        </div>

        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-4">
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Usuário
            </label>
            <input
              className="field-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder="admin"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Senha
            </label>
            <div className="relative">
              <input
                className="field-input pr-10"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 text-[15px]"
                style={{ color: 'var(--text-faint)' }}
                aria-label="Mostrar senha"
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className="mb-3 min-h-[14px] text-[11px]" style={{ color: 'var(--red)' }}>
            {error}
          </div>

          <button type="submit" disabled={submitting} className="btn btn-primary w-full">
            {unlocked ? 'Autenticado ✓' : submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  )
}
