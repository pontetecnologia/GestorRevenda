import { useState } from 'react'
import { useAuthStore } from '../store/auth.store'
import { Building2, Mail, Lock, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha email e senha')
      return
    }
    try {
      await login(email, password)
      toast.success('Bem-vindo ao RevendaHub!')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Email ou senha inválidos'
      toast.error(msg)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg shadow-blue-900/40">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">RevendaHub</h1>
          <p className="text-slate-400 text-sm mt-1">Gestão de Revenda SaaS</p>
        </div>

        {/* Card */}
        <div className="card shadow-2xl">
          <h2 className="text-lg font-semibold text-slate-100 mb-6">Entrar na sua conta</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  className="input pl-9"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  className="input pl-9"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary w-full justify-center py-2.5 mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Acesso restrito a usuários autorizados
        </p>
      </div>
    </div>
  )
}
