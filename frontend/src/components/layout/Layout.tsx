import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, FileText, Server, BarChart3,
  Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  Building2, KeyRound, Check,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store'
import clsx from 'clsx'

const ALL_NAV_ITEMS = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true, roles: ['ADMIN', 'MANAGER'] },
  { to: '/contratos', icon: FileText, label: 'Contratos', exact: false, roles: ['ADMIN', 'MANAGER', 'SUPPORT'] },
  { to: '/servidores', icon: Server, label: 'Servidores', exact: false, roles: ['ADMIN', 'MANAGER'] },
  { to: '/relatorios', icon: BarChart3, label: 'Relatórios', exact: false, roles: ['ADMIN', 'MANAGER'] },
  { to: '/configuracoes', icon: Settings, label: 'Configurações', exact: false, roles: ['ADMIN', 'MANAGER'] },
]

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  SUPPORT: 'Suporte',
}

const roleBadgeClass: Record<string, string> = {
  ADMIN: 'badge-purple',
  MANAGER: 'badge-blue',
  SUPPORT: 'badge-gray',
}

// ─── Cálculo da senha técnica ─────────────────────────────────────────────────
// Fórmula: dia * mes * (ano - 2000) * 3
function calcSenhaTecnica(date: Date): number {
  const dia = date.getDate()
  const mes = date.getMonth() + 1
  const ano = date.getFullYear() % 100  // ex: 2026 → 26
  return dia * mes * ano * 3
}

// ─── Botão de senha técnica ───────────────────────────────────────────────────
function SenhaTecnicaButton({ collapsed }: { collapsed: boolean }) {
  const [copied, setCopied] = useState(false)
  const [senha, setSenha] = useState(0)

  useEffect(() => {
    const update = () => setSenha(calcSenhaTecnica(new Date()))
    update()
    // Recalcula à meia-noite
    const now = new Date()
    const meianoite = new Date(now)
    meianoite.setDate(meianoite.getDate() + 1)
    meianoite.setHours(0, 0, 0, 0)
    const t = setTimeout(update, meianoite.getTime() - now.getTime())
    return () => clearTimeout(t)
  }, [])

  const handleClick = useCallback(() => {
    navigator.clipboard.writeText(String(senha)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [senha])

  const hoje = new Date()
  const d = hoje.getDate().toString().padStart(2, '0')
  const m = (hoje.getMonth() + 1).toString().padStart(2, '0')
  const a = (hoje.getFullYear() % 100).toString().padStart(2, '0')
  const formula = `${d} × ${m} × ${a} × 3 = ${senha}`

  if (collapsed) {
    return (
      <button
        onClick={handleClick}
        title={`Senha técnica: ${formula}\nClique para copiar`}
        className={clsx(
          'flex items-center justify-center w-full rounded-lg p-2 transition-all border',
          copied
            ? 'bg-green-900/40 border-green-600/50 text-green-400'
            : 'bg-amber-950/40 border-amber-700/40 text-amber-400 hover:bg-amber-900/40',
        )}
      >
        {copied ? <Check size={16} /> : <KeyRound size={16} />}
      </button>
    )
  }

  return (
    <button
      onClick={handleClick}
      title={`Fórmula: ${formula}\nClique para copiar`}
      className={clsx(
        'w-full rounded-xl px-3 py-2.5 transition-all border text-left group',
        copied
          ? 'bg-green-900/30 border-green-600/40'
          : 'bg-amber-950/30 border-amber-700/30 hover:bg-amber-900/30 hover:border-amber-600/50',
      )}
    >
      {/* Linha superior: label + ícone */}
      <div className="flex items-center gap-1.5 mb-1">
        <KeyRound size={12} className={clsx(copied ? 'text-green-400' : 'text-amber-500')} />
        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Senha técnica
        </span>
        {copied && (
          <span className="ml-auto flex items-center gap-1 text-xs text-green-400 font-medium">
            <Check size={11} />
            Copiada!
          </span>
        )}
        {!copied && (
          <span className="ml-auto text-xs text-slate-600 group-hover:text-slate-400 transition-colors">
            copiar
          </span>
        )}
      </div>

      {/* Número em destaque */}
      <div className={clsx(
        'font-mono font-bold tabular-nums leading-none transition-all',
        copied ? 'text-green-400 text-2xl' : 'text-amber-300 text-2xl',
      )}>
        {senha}
      </div>

      {/* Fórmula discreta */}
      <div className="text-xs text-slate-600 mt-1 font-mono">
        {formula}
      </div>
    </button>
  )
}

// ─── Layout principal ─────────────────────────────────────────────────────────
export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Filtrar menu conforme perfil
  const navItems = ALL_NAV_ITEMS.filter(item =>
    item.roles.includes(user?.role || 'SUPPORT')
  )

  const isSupport = user?.role === 'SUPPORT'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed lg:relative z-30 h-full flex flex-col bg-slate-900 border-r border-slate-700/50 transition-all duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          collapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-700/50">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="font-bold text-slate-100 text-sm">RevendaHub</span>
              <p className="text-xs text-slate-500">Gestão SaaS</p>
            </div>
          )}
          <button
            className="ml-auto lg:hidden text-slate-400 hover:text-slate-100"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
                )
              }
            >
              <item.icon size={18} className="flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + senha + collapse */}
        <div className="border-t border-slate-700/50 p-3 space-y-1">
          {/* Nome e perfil */}
          {!collapsed && (
            <div className="px-2 py-2 border-b border-slate-800 mb-1">
              <p className="text-sm font-medium text-slate-200 truncate">{user?.name}</p>
              <span className={clsx('badge mt-1', roleBadgeClass[user?.role || 'SUPPORT'])}>
                {roleLabels[user?.role || 'SUPPORT']}
              </span>
            </div>
          )}

          {/* Senha técnica — todos os perfis */}
          <SenhaTecnicaButton collapsed={collapsed} />

          {/* Sair */}
          <button
            onClick={handleLogout}
            className="btn-ghost w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <LogOut size={16} />
            {!collapsed && 'Sair'}
          </button>

          {/* Recolher */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex btn-ghost w-full justify-start"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && 'Recolher menu'}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-slate-900 border-b border-slate-700/50">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-slate-100"
          >
            <Menu size={20} />
          </button>
          <span className="font-semibold text-slate-100">RevendaHub</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
