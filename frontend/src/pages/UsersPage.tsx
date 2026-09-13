import { useCallback, useEffect, useState } from 'react'
import * as api from '../lib/api'
import TopNav from '../components/TopNav'
import { useToast } from '../context/ToastContext'
import { ApiError } from '../lib/api'
import type { Invite, User } from '../lib/types'

export default function UsersPage() {
  const { showToast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [u, i] = await Promise.all([api.listUsers(), api.listInvites()])
    setUsers(u)
    setInvites(i)
  }, [])

  useEffect(() => {
    load().finally(() => setLoading(false))
  }, [load])

  async function handleToggleActive(user: User) {
    try {
      await api.setUserActive(user.id, !user.active)
      await load()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível atualizar o usuário.')
    }
  }

  async function handleGenerateInvite() {
    setGenerating(true)
    try {
      const invite = await api.createInvite()
      setLastInviteUrl(invite.invite_url)
      await navigator.clipboard.writeText(invite.invite_url).catch(() => {})
      showToast('Link de convite copiado — válido por 1 hora')
      await load()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível gerar o convite.')
    } finally {
      setGenerating(false)
    }
  }

  async function handleRevoke(invite: Invite) {
    try {
      await api.revokeInvite(invite.id)
      if (lastInviteUrl && invite.invite_url === lastInviteUrl) setLastInviteUrl(null)
      await load()
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : 'Não foi possível revogar o convite.')
    }
  }

  function inviteStatus(invite: Invite): { label: string; color: string } {
    if (invite.used_at) return { label: 'usado', color: 'var(--text-faint)' }
    if (invite.revoked_at) return { label: 'revogado', color: 'var(--text-faint)' }
    if (new Date(invite.expires_at).getTime() < Date.now()) return { label: 'expirado', color: 'var(--text-faint)' }
    return { label: 'pendente', color: 'var(--amber)' }
  }

  const pendingInvites = invites.filter((i) => !i.used_at && !i.revoked_at)

  return (
    <div className="mx-auto max-w-[920px] px-5 pb-20 pt-6">
      <TopNav />

      <div className="mb-4 flex items-baseline justify-between">
        <div className="font-display text-[22px] font-extrabold">Usuários</div>
        <button onClick={handleGenerateInvite} disabled={generating} className="btn btn-primary">
          {generating ? 'Gerando…' : '+ Gerar convite'}
        </button>
      </div>

      {lastInviteUrl && (
        <div className="panel mb-6 flex flex-wrap items-center gap-3 p-4 text-[12px]">
          <span style={{ color: 'var(--text-faint)' }}>Link (válido por 1h, já copiado):</span>
          <code className="flex-1 break-all" style={{ color: 'var(--amber)' }}>
            {lastInviteUrl}
          </code>
        </div>
      )}

      <div className="panel mb-8 p-5">
        <div className="mb-3 text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Contas
        </div>
        {loading ? (
          <div className="skeleton h-8 w-full" />
        ) : (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: 'var(--border)' }}
              >
                <div>
                  <div className="font-display text-[14px] font-bold">
                    {u.username}
                    {u.role === 'admin' && (
                      <span
                        className="ml-2 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wider"
                        style={{ borderColor: 'var(--amber-dim)', color: 'var(--amber)' }}
                      >
                        admin
                      </span>
                    )}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>
                    {u.active ? 'ativo' : 'desativado'}
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(u)}
                  className="rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-wider transition-colors"
                  style={{ borderColor: 'var(--border)', color: u.active ? 'var(--red)' : 'var(--green)' }}
                >
                  {u.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel p-5">
        <div className="mb-3 text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-faint)' }}>
          Convites pendentes
        </div>
        {loading ? (
          <div className="skeleton h-8 w-full" />
        ) : pendingInvites.length === 0 ? (
          <div className="text-[12px]" style={{ color: 'var(--text-faint)' }}>
            Nenhum convite pendente.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingInvites.map((i) => {
              const status = inviteStatus(i)
              return (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <div className="text-[11px]" style={{ color: status.color }}>
                    {status.label} · expira {new Date(i.expires_at).toLocaleTimeString('pt-BR', { hour12: false })}
                  </div>
                  <button
                    onClick={() => handleRevoke(i)}
                    className="rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-wider"
                    style={{ borderColor: 'var(--border)', color: 'var(--red)' }}
                  >
                    Revogar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
