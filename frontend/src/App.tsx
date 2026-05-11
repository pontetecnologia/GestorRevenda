import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth.store'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import ContractsPage from './pages/contracts/ContractsPage'
import ContractDetailPage from './pages/contracts/ContractDetailPage'
import ServersPage from './pages/servers/ServersPage'
import ReportsPage from './pages/reports/ReportsPage'
import SettingsPage from './pages/settings/SettingsPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function HomeRedirect() {
  const { user } = useAuthStore()
  if (user?.role === 'SUPPORT') return <Navigate to="/contratos" replace />
  return <DashboardPage />
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  const { loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [loadFromStorage])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route path="contratos" element={<ContractsPage />} />
          <Route path="contratos/:id" element={<ContractDetailPage />} />
          <Route path="servidores" element={<ServersPage />} />
          <Route path="relatorios" element={<ReportsPage />} />
          <Route path="configuracoes" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
