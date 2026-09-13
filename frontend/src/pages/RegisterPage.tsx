import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ApiError } from '../lib/api'
import * as api from '../lib/api'

export default function RegisterPage() {
  const { status, refresh } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (status === 'authenticated') {
    return <Navigate to="/medicacao" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await api.register(token, username, password)
      await refresh()
      setDone(true)
      setTimeout(() => navigate('/medicacao', { replace: true }), 350)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível criar a conta.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center pt-[6vh]">
        <div className="panel w-full max-w-[340px] p-9 text-center">
          <div className="font-display text-[18px] font-extrabold" style={{ color: 'var(--red)' }}>
            Link inválido
          </div>
          <div className="mt-2 text-[12px]" style={{ color: 'var(--text-faint)' }}>
            Esse link de convite está incompleto. Peça um novo link pra quem administra o pulse.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center pt-[6vh]">
      <div className="panel w-full max-w-[340px] p-9 pb-8 text-center">
        <span className="rivet rivet-tl" />
        <span className="rivet rivet-tr" />
        <span className="rivet rivet-bl" />
        <span className="rivet rivet-br" />

        <div className="font-display text-[22px] font-extrabold">PULSO</div>
        <div className="mb-6 text-[11px] tracking-wide" style={{ color: 'var(--text-faint)' }}>
          CRIAR CONTA
        </div>

        <form onSubmit={handleSubmit} className="text-left">
          <div className="mb-4">
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Escolha um usuário
            </label>
            <input
              className="field-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Escolha uma senha
            </label>
            <div className="relative">
              <input
                className="field-input pr-10"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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
            {done ? 'Conta criada ✓' : submitting ? 'Criando…' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
