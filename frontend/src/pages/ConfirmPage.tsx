import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import * as api from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { ConfirmInfo } from '../lib/types'

type LoadState = 'loading' | 'ready' | 'error'

export default function ConfirmPage() {
  const [params] = useSearchParams()
  const occurrence = Number(params.get('occurrence'))
  const token = params.get('token') ?? ''
  const { showToast } = useToast()

  const [state, setState] = useState<LoadState>('loading')
  const [info, setInfo] = useState<ConfirmInfo | null>(null)
  const [done, setDone] = useState(false)
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null)
  const [apiLine, setApiLine] = useState(
    `GET /api/occurrences/confirm?occurrence=${occurrence}&token=${token.slice(0, 18)}…`,
  )

  useEffect(() => {
    if (!occurrence || !token) {
      setState('error')
      setApiLine('400 · parâmetros ausentes na URL')
      return
    }
    api
      .getConfirmInfo(occurrence, token)
      .then((res) => {
        setInfo(res)
        setDone(res.already_confirmed)
        setState('ready')
        setApiLine(`200 OK · ocorrência #${res.occurrence_id} → "${res.habit_name}"`)
      })
      .catch((err) => {
        setState('error')
        setApiLine(`${err instanceof api.ApiError ? err.status : '400'} · token inválido ou expirado`)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [occurrence, token])

  async function handleConfirm() {
    if (done) return
    try {
      const res = await api.confirmOccurrenceByToken(occurrence, token)
      setDone(true)
      setConfirmedAt(res.confirmed_at)
      showToast(
        <>
          <b style={{ color: 'var(--green)' }}>Confirmação</b> registrada
        </>,
        async () => {
          await api.unconfirmOccurrenceByToken(occurrence, token)
          setDone(false)
          setConfirmedAt(null)
        },
      )
    } catch {
      // se o token expirou entre a leitura e o clique, cai pro estado de erro
      setState('error')
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center pt-[6vh]">
      <div className="panel w-full max-w-[360px] p-8 pb-7 text-center">
        <span className="rivet rivet-tl" />
        <span className="rivet rivet-tr" />
        <span className="rivet rivet-bl" />
        <span className="rivet rivet-br" />

        <div className="mb-2.5 text-[11px] uppercase tracking-[.2em] font-semibold" style={{ color: 'var(--text-faint)' }}>
          Lembrete pendente
        </div>

        <div
          className="mb-5 flex items-center gap-2 rounded-md border px-2.5 py-2.5 text-left text-[10px]"
          style={{ background: '#0f0d07', borderColor: 'var(--border)', color: 'var(--text-faint)', wordBreak: 'break-all' }}
        >
          <span
            className={`h-1.5 w-1.5 flex-none rounded-full ${state === 'loading' ? 'animate-pulse-dot' : ''}`}
            style={{
              background: state === 'error' ? 'var(--red)' : state === 'ready' ? 'var(--green)' : 'var(--amber)',
              boxShadow:
                state === 'error'
                  ? '0 0 6px var(--red-glow)'
                  : state === 'ready'
                    ? '0 0 6px var(--green-glow)'
                    : '0 0 6px var(--amber-glow)',
            }}
          />
          <span>{apiLine}</span>
        </div>

        {state === 'loading' && (
          <>
            <div className="skeleton mx-auto mb-2.5 h-7 w-[68%]" />
            <div className="skeleton mx-auto mb-[26px] h-[13px] w-[36%]" />
          </>
        )}

        {state === 'ready' && info && (
          <>
            <div className="font-display mb-1.5 text-[30px] font-extrabold">{info.habit_name}</div>
            <div className="mb-[26px] text-[13px] font-semibold tracking-wide" style={{ color: 'var(--amber)' }}>
              hoje · {new Date(info.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </>
        )}

        {state === 'error' && (
          <div className="mb-2">
            <div className="mb-2 text-[32px]" style={{ filter: 'drop-shadow(0 0 14px var(--red-glow))' }}>
              ⚠
            </div>
            <div className="font-display mb-2 text-[21px] font-extrabold leading-tight" style={{ color: 'var(--red)' }}>
              Link inválido ou expirado
            </div>
            <div className="mb-[22px] text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
              Esse lembrete não pode mais ser confirmado por aqui — mas ainda dá pra registrar direto no painel.
            </div>
            <a href="/medicacao" className="btn btn-primary mb-1.5 inline-block">
              Abrir o painel
            </a>
          </div>
        )}

        {state !== 'error' && (
          <>
            <button
              onClick={handleConfirm}
              className={`lever mx-auto mb-[22px] ${state === 'loading' ? 'lever-loading' : ''} ${done ? 'lever-done' : ''}`}
            >
              <div className="lever-inner">
                <svg viewBox="0 0 24 24" className="mb-1 h-[38px] w-[38px]">
                  <path className="check-path" d="M4 12.5l5 5L20 6" />
                </svg>
                <span className="font-mono text-[13px] font-bold tracking-wider" style={{ color: '#1a1204' }}>
                  {done ? 'FEITO' : 'CONFIRMAR'}
                </span>
              </div>
            </button>
            <div
              className="min-h-[16px] text-[11px] uppercase tracking-wider"
              style={{ color: done ? 'var(--green)' : 'var(--text-faint)' }}
            >
              {done
                ? `confirmado às ${confirmedAt ? new Date(confirmedAt).toLocaleTimeString('pt-BR', { hour12: false }) : ''}`
                : 'toque para confirmar'}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
