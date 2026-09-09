import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ConfirmPage from './pages/ConfirmPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/confirm" element={<ConfirmPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/:category" element={<DashboardPage />} />
            </Route>

            <Route path="/" element={<Navigate to="/medicacao" replace />} />
            <Route path="*" element={<Navigate to="/medicacao" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
