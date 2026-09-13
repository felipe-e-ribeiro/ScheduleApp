import { useState } from 'react'
import TopNav from '../components/TopNav'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import * as api from '../lib/api'
import { ApiError } from '../lib/api'
import type { TelegramLinkCode } from '../lib/types'

export default function ProfilePage() {
  const { username, telegramLinked, refresh } = useAuth()
  const { showToast } = useToast()
  const [generating, setGenerating] = useState(false)
  const [linkCode, setLinkCode] = useState<TelegramLinkCode | null>(null)

  async function handleGenerateCode() {
    setGenerating(true)
    try {
      const code = await api.createTelegramLinkCode()
      setLinkCode(code)
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível gerar o código.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="mx-auto max-w-[920px] px-5 pb-20 pt-6">
      <TopNav />

      <div className="mb-4 font-display text-[22px] font-extrabold">Perfil</div>

      <div className="panel mb-6 p-5">
        <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Usuário
        </div>
        <div className="font-display text-[16px] font-bold">{username}</div>
      </div>

      <div className="panel p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
              Telegram
            </div>
            <div className="mt-1 flex items-center gap-2 text-[13px]">
              <span
                className="h-[7px] w-[7px] rounded-full"
                style={{
                  background: telegramLinked ? 'var(--green)' : 'var(--text-faint)',
                  boxShadow: telegramLinked ? '0 0 8px var(--green-glow)' : 'none',
                }}
              />
              {telegramLinked ? 'Vinculado' : 'Não vinculado'}
            </div>
          </div>
          <button onClick={handleGenerateCode} disabled={generating} className="btn btn-primary">
            {generating ? 'Gerando…' : telegramLinked ? 'Vincular outra conta' : 'Gerar código de vinculação'}
          </button>
        </div>

        {!telegramLinked && (
          <div className="mb-3 text-[12px]" style={{ color: 'var(--text-faint)' }}>
            Sem vínculo, o pulse não consegue te notificar — cadastro de hábitos fica bloqueado até vincular.
          </div>
        )}

        {linkCode && (
          <div className="space-y-2 rounded-xl border p-4 text-[12px]" style={{ borderColor: 'var(--border)' }}>
            <div>
              <a
                href={linkCode.deep_link}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary inline-block"
                onClick={() => setTimeout(refresh, 3000)}
              >
                Abrir no Telegram
              </a>
            </div>
            <div style={{ color: 'var(--text-faint)' }}>
              Ou mande manualmente pro bot:{' '}
              <code style={{ color: 'var(--amber)' }}>/start {linkCode.code}</code>
            </div>
            <div style={{ color: 'var(--text-faint)' }}>
              Válido até {new Date(linkCode.expires_at).toLocaleTimeString('pt-BR', { hour12: false })}.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
