import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Settings, Link, Target, Users, CheckCircle, XCircle,
  RefreshCw, Eye, EyeOff, Save, Loader2, Plus, Edit2,
} from 'lucide-react'
import api from '../../services/api'
import { Loading, ErrorMsg, Modal } from '../../components/ui'
import { useAuthStore } from '../../store/auth.store'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type SettingsTab = 'metas' | 'intelidata' | 'uniplus' | 'usuarios'

const TABS: { id: SettingsTab; label: string; icon: any; adminOnly?: boolean }[] = [
  { id: 'metas', label: 'Metas', icon: Target },
  { id: 'intelidata', label: 'Intelidata', icon: Link, adminOnly: true },
  { id: 'uniplus', label: 'Uniplus Ponte', icon: Link, adminOnly: true },
  { id: 'usuarios', label: 'Usuários', icon: Users, adminOnly: true },
]

const MONTHS = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

// ---- Metas ----
function GoalsTab() {
  const qc = useQueryClient()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [form, setForm] = useState({ desiredActiveContracts: 0, desiredIntelidataCostValue: 0, desiredSalesValue: 0 })

  const { data: goal, isLoading } = useQuery({
    queryKey: ['goal', year, month],
    queryFn: () => api.get(`/settings/goals?year=${year}&month=${month}`).then(r => r.data),
  })

  useEffect(() => {
    if (goal) {
      setForm({
        desiredActiveContracts: goal.desiredActiveContracts,
        desiredIntelidataCostValue: Number(goal.desiredIntelidataCostValue),
        desiredSalesValue: Number(goal.desiredSalesValue),
      })
    }
  }, [goal])

  const save = useMutation({
    mutationFn: () => api.put('/settings/goals', { year, month, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goal'] })
      toast.success('Metas salvas!')
    },
  })

  return (
    <div className="card max-w-lg">
      <h3 className="font-semibold text-slate-100 mb-4">Configurar Metas</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="form-group">
          <label className="label">Mês</label>
          <select className="select" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="label">Ano</label>
          <select className="select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      {isLoading ? <Loading size="sm" /> : (
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Meta de Contratos Ativos</label>
            <input type="number" className="input" value={form.desiredActiveContracts}
              onChange={e => setForm(p => ({ ...p, desiredActiveContracts: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="label">Meta Custo Intelidata (R$)</label>
            <input type="number" step="0.01" className="input" value={form.desiredIntelidataCostValue}
              onChange={e => setForm(p => ({ ...p, desiredIntelidataCostValue: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="label">Meta de Valor de Venda (R$)</label>
            <input type="number" step="0.01" className="input" value={form.desiredSalesValue}
              onChange={e => setForm(p => ({ ...p, desiredSalesValue: Number(e.target.value) }))} />
          </div>
          <button className="btn-primary" disabled={save.isPending} onClick={() => save.mutate()}>
            <Save size={14} />
            {save.isPending ? 'Salvando...' : 'Salvar Metas'}
          </button>
        </div>
      )}
    </div>
  )
}

// ---- Intelidata ----
function IntelidataTab() {
  const qc = useQueryClient()
  const [baseUrl, setBaseUrl] = useState('')
  const [token, setToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
    onSuccess: (d: any) => {
      setBaseUrl(d.INTELIDATA_BASE_URL || '')
      setToken(d.INTELIDATA_TOKEN || '')
    },
  } as any)

  useEffect(() => {
    if (settings) {
      const s = settings as Record<string, string>
      setBaseUrl(s.INTELIDATA_BASE_URL || '')
      setToken(s.INTELIDATA_TOKEN || '')
    }
  }, [settings])

  const saveSettings = useMutation({
    mutationFn: () => api.put('/settings/intelidata', { baseUrl, token: token.startsWith('*') ? undefined : token }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['settings'] }); toast.success('Configurações salvas!') },
  })

  const testConnection = useMutation({
    mutationFn: () => api.post('/settings/intelidata/test').then(r => r.data),
    onSuccess: (data) => setTestResult(data),
    onError: () => setTestResult({ success: false, message: 'Erro ao testar conexão' }),
  })

  const syncContracts = useMutation({
    mutationFn: () => api.post('/settings/intelidata/sync').then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['contracts'] })
      if (data.success) {
        toast.success(`Sincronizado! ${data.totalCreated} criados, ${data.totalUpdated} atualizados`)
      } else {
        toast.error(`Erro: ${data.errorMessage}`)
      }
    },
  })

  return (
    <div className="space-y-4 max-w-lg">
      <div className="card">
        <h3 className="font-semibold text-slate-100 mb-4">API Intelidata</h3>
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">URL Base</label>
            <input className="input" placeholder="https://canal.intelidata.inf.br/public-api"
              value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="label">Token de Acesso</label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                className="input pr-10"
                placeholder="Token da API..."
                value={token}
                onChange={e => setToken(e.target.value)}
              />
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                onClick={() => setShowToken(!showToken)}
              >
                {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">O token é armazenado de forma criptografada</p>
          </div>
          <button className="btn-primary" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
            <Save size={14} />
            Salvar
          </button>
        </div>
      </div>

      {/* Ações */}
      <div className="card space-y-3">
        <h3 className="font-semibold text-slate-100 mb-2">Ações</h3>
        <div className="flex gap-3">
          <button
            className="btn-secondary"
            disabled={testConnection.isPending}
            onClick={() => testConnection.mutate()}
          >
            {testConnection.isPending ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
            Testar Conexão
          </button>
          <button
            className="btn-primary"
            disabled={syncContracts.isPending}
            onClick={() => syncContracts.mutate()}
          >
            {syncContracts.isPending ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {syncContracts.isPending ? 'Sincronizando...' : 'Sincronizar Contratos'}
          </button>
        </div>
        {testResult && (
          <div className={clsx(
            'flex items-center gap-2 p-3 rounded-lg text-sm border',
            testResult.success
              ? 'bg-green-900/20 border-green-700/30 text-green-400'
              : 'bg-red-900/20 border-red-700/30 text-red-400'
          )}>
            {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
            {testResult.message}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Uniplus ----
function UniplusTab() {
  const [baseUrl, setBaseUrl] = useState('')
  const [tenant, setTenant] = useState('')
  const [token, setToken] = useState('')

  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings').then(r => r.data),
  })

  useEffect(() => {
    if (settings) {
      setBaseUrl(settings.UNIPLUS_BASE_URL || '')
      setTenant(settings.UNIPLUS_TENANT || '')
      setToken(settings.UNIPLUS_TOKEN || '')
    }
  }, [settings])

  const save = useMutation({
    mutationFn: () => api.put('/settings/uniplus', { baseUrl, tenant, token: token.startsWith('*') ? undefined : token }),
    onSuccess: () => toast.success('Configurações Uniplus salvas!'),
  })

  return (
    <div className="card max-w-lg">
      <h3 className="font-semibold text-slate-100 mb-4">Integração Uniplus</h3>
      <div className="space-y-4">
        <div className="form-group">
          <label className="label">URL Base do Servidor</label>
          <input className="input" placeholder="https://meucliente.intelidata.inf.br"
            value={baseUrl} onChange={e => setBaseUrl(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Tenant / Conta</label>
          <input className="input" placeholder="uniplus" value={tenant} onChange={e => setTenant(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="label">Token Bearer</label>
          <input type="password" className="input" placeholder="eyJhbGci..."
            value={token} onChange={e => setToken(e.target.value)} />
        </div>
        <p className="text-xs text-slate-500 bg-slate-800 rounded-lg p-3">
          A estrutura de integração com a API Uniplus está preparada para consultas de vendas, entidades, 
          ordens de serviço e outros endpoints. Consulte a documentação para configurar os endpoints desejados.
        </p>
        <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
          <Save size={14} />
          Salvar
        </button>
      </div>
    </div>
  )
}

// ---- Users ----
function UsersTab() {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'SUPPORT' as const })

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const createUser = useMutation({
    mutationFn: (data: any) => editingId ? api.put(`/users/${editingId}`, data) : api.post('/users', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setModalOpen(false)
      setEditingId(null)
      toast.success(editingId ? 'Usuário atualizado!' : 'Usuário criado!')
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Erro ao salvar usuário'),
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: any) => api.patch(`/users/${id}/${active ? 'deactivate' : 'activate'}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Status alterado!') },
  })

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', role: 'SUPPORT' })
    setEditingId(null)
    setModalOpen(true)
  }

  const openEdit = (u: any) => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role })
    setEditingId(u.id)
    setModalOpen(true)
  }

  const roleBadge: Record<string, string> = {
    ADMIN: 'badge-purple',
    MANAGER: 'badge-blue',
    SUPPORT: 'badge-gray',
  }
  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    MANAGER: 'Gestor',
    SUPPORT: 'Suporte',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-100">Gerenciar Usuários</h3>
        <button className="btn-primary text-sm" onClick={openCreate}>
          <Plus size={14} />
          Novo Usuário
        </button>
      </div>

      {isLoading ? <Loading size="sm" /> : (
        <div className="card p-0 overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u: any) => (
                <tr key={u.id}>
                  <td className="font-medium text-slate-200">{u.name}</td>
                  <td className="text-slate-400 text-sm">{u.email}</td>
                  <td><span className={clsx('badge', roleBadge[u.role])}>{roleLabel[u.role]}</span></td>
                  <td>
                    <span className={clsx('badge', u.active ? 'badge-green' : 'badge-red')}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-ghost text-xs p-1.5" onClick={() => openEdit(u)}>
                        <Edit2 size={13} />
                      </button>
                      <button
                        className={clsx('btn-ghost text-xs p-1.5', u.active ? 'text-red-400 hover:bg-red-900/20' : 'text-green-400 hover:bg-green-900/20')}
                        onClick={() => toggleActive.mutate({ id: u.id, active: u.active })}
                      >
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Usuário' : 'Novo Usuário'} size="sm">
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">Nome</label>
            <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          {!editingId && (
            <div className="form-group">
              <label className="label">Senha</label>
              <input type="password" className="input" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
          )}
          <div className="form-group">
            <label className="label">Perfil</label>
            <select className="select" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as any }))}>
              <option value="SUPPORT">Suporte</option>
              <option value="MANAGER">Gestor</option>
              <option value="ADMIN">Administrador</option>
            </select>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-primary" onClick={() => createUser.mutate(form)} disabled={createUser.isPending}>
              {editingId ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ---- Main ----
export default function SettingsPage() {
  const { user, can } = useAuthStore()
  const [tab, setTab] = useState<SettingsTab>('metas')

  const availableTabs = TABS.filter(t => !t.adminOnly || can(['ADMIN']))

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie integrações, metas e usuários</p>
      </div>

      <div className="tabs-container overflow-x-auto">
        {availableTabs.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab-active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            <t.icon size={14} className="inline mr-1.5" />
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 'metas' && <GoalsTab />}
        {tab === 'intelidata' && can(['ADMIN']) && <IntelidataTab />}
        {tab === 'uniplus' && can(['ADMIN']) && <UniplusTab />}
        {tab === 'usuarios' && can(['ADMIN']) && <UsersTab />}
      </div>
    </div>
  )
}
