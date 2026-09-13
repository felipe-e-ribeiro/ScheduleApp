import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface Props {
  /** Exige role="admin" alem de estar autenticado -- usuario comum e mandado
   * de volta pro dashboard (a protecao de verdade e' o 403 do backend, isso
   * aqui e' so' pra nao nem mostrar a tela). */
  adminOnly?: boolean
}

export default function ProtectedRoute({ adminOnly = false }: Props) {
  const { status, isAdmin } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span
          className="h-3 w-3 animate-pulse-dot rounded-full"
          style={{ background: 'var(--amber)', boxShadow: '0 0 10px var(--amber-glow)' }}
        />
      </div>
    )
  }

  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (adminOnly && !isAdmin) {
    return <Navigate to="/medicacao" replace />
  }

  return <Outlet />
}
