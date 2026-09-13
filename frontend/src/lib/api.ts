import type { ConfirmInfo, Habit, HabitInput, HabitStats, HabitType, Invite, TodayOccurrence, User, UserRole } from './types'

const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''

export class ApiError extends Error {
  status: number
  /** Corpo de `detail` cru da resposta -- string na maioria dos erros, mas
   * pode ser um objeto estruturado (ex: { error: "too_early", ... }). */
  detail: unknown
  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })

  if (!res.ok) {
    let detail: unknown = res.statusText
    try {
      const body = await res.json()
      detail = body.detail ?? detail
    } catch {
      // corpo nao era JSON, mantem statusText
    }
    const message = typeof detail === 'string' ? detail : res.statusText
    throw new ApiError(res.status, message, detail)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------

export function login(username: string, password: string) {
  return request<{ ok: true }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function logout() {
  return request<{ ok: true }>('/api/auth/logout', { method: 'POST' })
}

export function me() {
  return request<{ ok: true; username: string; role: UserRole }>('/api/auth/me')
}

export function register(token: string, username: string, password: string) {
  return request<{ ok: true }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ token, username, password }),
  })
}

// ---------------------------------------------------------------------------
// admin -- usuarios e convites
// ---------------------------------------------------------------------------

export function listUsers() {
  return request<User[]>('/api/admin/users')
}

export function setUserActive(id: number, active: boolean) {
  return request<User>(`/api/admin/users/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) })
}

export function listInvites() {
  return request<Invite[]>('/api/admin/invites')
}

export function createInvite() {
  return request<Invite>('/api/admin/invites', { method: 'POST' })
}

export function revokeInvite(id: number) {
  return request<{ ok: true }>(`/api/admin/invites/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// habits
// ---------------------------------------------------------------------------

export function listHabits(type?: HabitType) {
  const qs = type ? `?type=${type}` : ''
  return request<Habit[]>(`/api/habits${qs}`)
}

export function createHabit(input: HabitInput) {
  return request<Habit>('/api/habits', { method: 'POST', body: JSON.stringify(input) })
}

export function updateHabit(id: number, input: Partial<HabitInput> & { active?: boolean }) {
  return request<Habit>(`/api/habits/${id}`, { method: 'PATCH', body: JSON.stringify(input) })
}

export function deactivateHabit(id: number) {
  return request<{ ok: true }>(`/api/habits/${id}`, { method: 'DELETE' })
}

// ---------------------------------------------------------------------------
// occurrences -- painel (admin, sem token)
// ---------------------------------------------------------------------------

export function listToday() {
  return request<TodayOccurrence[]>('/api/occurrences/today')
}

export function confirmOccurrenceAdmin(occurrenceId: number) {
  return request<{ ok: true; confirmed_at: string }>(`/api/occurrences/${occurrenceId}/confirm`, {
    method: 'POST',
  })
}

export function unconfirmOccurrenceAdmin(occurrenceId: number) {
  return request<{ ok: true; status: string }>(`/api/occurrences/${occurrenceId}/unconfirm`, {
    method: 'POST',
  })
}

// ---------------------------------------------------------------------------
// occurrences -- link do Telegram (token, sem login)
// ---------------------------------------------------------------------------

export function getConfirmInfo(occurrence: number, token: string) {
  return request<ConfirmInfo>(`/api/occurrences/confirm?occurrence=${occurrence}&token=${encodeURIComponent(token)}`)
}

export function confirmOccurrenceByToken(occurrence: number, token: string) {
  return request<{ ok: true; confirmed_at: string }>(
    `/api/occurrences/confirm?occurrence=${occurrence}&token=${encodeURIComponent(token)}`,
    { method: 'POST' },
  )
}

export function unconfirmOccurrenceByToken(occurrence: number, token: string) {
  return request<{ ok: true; status: string }>(
    `/api/occurrences/unconfirm?occurrence=${occurrence}&token=${encodeURIComponent(token)}`,
    { method: 'POST' },
  )
}

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------

export function getHabitStats(habitId: number, days = 90) {
  return request<HabitStats>(`/api/stats/habits/${habitId}?days=${days}`)
}
