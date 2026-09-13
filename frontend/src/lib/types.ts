export type HabitType = 'medication' | 'gym' | 'custom'

export type OccurrenceStatus = 'pending' | 'notified' | 'confirmed' | 'missed'

export interface Habit {
  id: number
  name: string
  type: HabitType
  times: string[]
  days_of_week: number[] | null
  retry_interval_min: number
  max_retries: number
  early_confirm_guard_hours: number
  active: boolean
}

export interface HabitInput {
  name: string
  type: HabitType
  times: string[]
  days_of_week: number[] | null
  retry_interval_min: number
  max_retries: number
  early_confirm_guard_hours: number
}

export interface TooEarlyDetail {
  error: 'too_early'
  habit_name: string
  scheduled_at: string
  now: string
  guard_hours: number
}

export interface TodayOccurrence {
  id: number
  habit_id: number
  time: string
  status: OccurrenceStatus
}

export interface HabitStats {
  habit_id: number
  total: number
  confirmed: number
  missed: number
  pending: number
  adherence_pct: number | null
  current_streak: number
  history: { scheduled_at: string; status: OccurrenceStatus; confirmed_at: string | null }[]
}

export interface ConfirmInfo {
  occurrence_id: number
  habit_id: number
  habit_name: string | null
  scheduled_at: string
  status: OccurrenceStatus
  already_confirmed: boolean
}

export type UserRole = 'admin' | 'user'

export interface User {
  id: number
  username: string
  role: UserRole
  active: boolean
  created_at: string
}

export interface Invite {
  id: number
  invite_url: string
  expires_at: string
  used_at: string | null
  revoked_at: string | null
}
