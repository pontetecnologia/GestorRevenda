import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Edit2, Trash2, Server, DollarSign, Activity,
  ChevronDown, ChevronRight, Unlink, Eye, Users,
} from 'lucide-react'
import api from '../../services/api'
import { Loading, ErrorMsg, Empty, Modal, ConfirmDialog, Currency, StatusBadge } from '../../components/ui'
import { useAuthStore } from '../../store/auth.store'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface ServerForm {
  name: string
  url: string
  publicIp: string
  ramGb: number
  vcpu: number
  storageGb: number
  monthlyCost: number
  monthlyRevenue: number
  status: 'ACTIVE' | 'INACTIVE'
  observation: string
}

const emptyForm: ServerForm = {
  name: '', url: '', publicIp: '',
  ramGb: 0, vcpu: 0, storageGb: 0,
  monthlyCost: 0, monthlyRevenue: 0,
  status: 'ACTIVE', observation: '',
}

const fmtBrl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// ─── Painel de contratos vinculados a um servidor ─────────────────────────────
function ServerContractsPanel({ server, canEdit }: { server: any; canEdit: boolean }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [unlinkTarget, setUnlinkTarget] = useState<{ contractId: string; name: string } | null>(null)

  const contracts = server.contractServers || []
  const ativos = contracts.filter((cs: any) => [1, 3, 5].includes(cs.contract?.idStatus))
  const inativos = contracts.filter((cs: any) => ![1, 3, 5].includes(cs.contract?.idStatus))

  // Custo proporcional apenas para ativos
  const custoUnitario = ativos.length > 0
    ? Number(server.monthlyCost) / ativos.length
    : 0

  const unlinkMutation = useMutation({
    mutationFn: ({ contractId }: { contractId: string }) =>
      api.post(`/contracts/${contractId}/unlink-server`, { serverId: server.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servers'] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      setUnlinkTarget(null)
      toast.success('Contrato desvinculado. Custos recalculados.')
    },
    onError: () => toast.error('Erro ao desvincular contrato'),
  })

  if (contracts.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-2 text-center">
        Nenhum contrato vinculado a este servidor.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {/* Rateio */}
      <div className="flex items-center gap-4 px-1 text-xs text-slate-400">
        <span>
          <span className="text-slate-300 font-medium">{ativos.length}</span> ativo(s) no rateio
        </span>
        {inativos.length > 0 && (
          <span>
            <span className="text-slate-500">{inativos.length}</span> encerrado(s) — fora do rateio
          </span>
        )}
        {ativos.length > 0 && (
          <span className="ml-auto">
            Custo por contrato:{' '}
            <span className="text-green-400 font-medium">{fmtBrl(custoUnitario)}</span>
          </span>
        )}
      </div>

      {/* Ativos */}
      {ativos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
            Contratos Ativos
          </p>
          <div className="space-y-1">
            {ativos.map((cs: any) => {
              const c = cs.contract
              return (
                <div
                  key={cs.id}
                  className="flex items-center gap-3 px-3 py-2 bg-slate-800/60 border border-slate-700/40 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{c?.clienteFinal}</p>
                    <p className="text-xs font-mono text-slate-500">{c?.cpfCnpj}</p>
                  </div>
                  <StatusBadge idStatus={c?.idStatus} />
                  <span className="text-xs text-green-400 font-medium w-20 text-right shrink-0">
                    {fmtBrl(custoUnitario)}
                  </span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      className="btn-ghost text-xs p-1.5"
                      title="Ver contrato"
                      onClick={() => navigate(`/contratos/${c?.id}`)}
                    >
                      <Eye size={13} />
                    </button>
                    {canEdit && (
                      <button
                        className="btn-ghost text-xs p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        title="Desvincular"
                        onClick={() => setUnlinkTarget({ contractId: c?.id, name: c?.clienteFinal })}
                      >
                        <Unlink size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Encerrados/Migrados — fora do rateio */}
      {inativos.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 uppercase tracking-wide mb-1.5">
            Fora do Rateio (Encerrados / Migrados)
          </p>
          <div className="space-y-1">
            {inativos.map((cs: any) => {
              const c = cs.contract
              return (
                <div
                  key={cs.id}
                  className="flex items-center gap-3 px-3 py-2 bg-slate-900/40 border border-slate-800 rounded-lg opacity-60"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-400 truncate">{c?.clienteFinal}</p>
                    <p className="text-xs font-mono text-slate-600">{c?.cpfCnpj}</p>
                  </div>
                  <StatusBadge idStatus={c?.idStatus} />
                  <span className="text-xs text-slate-600 w-20 text-right shrink-0">R$ 0,00</span>
                  <div className="flex gap-1 shrink-0">
                    <button
                      className="btn-ghost text-xs p-1.5"
                      title="Ver contrato"
                      onClick={() => navigate(`/contratos/${c?.id}`)}
                    >
                      <Eye size={13} />
                    </button>
                    {canEdit && (
                      <button
                        className="btn-ghost text-xs p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        title="Desvincular"
                        onClick={() => setUnlinkTarget({ contractId: c?.id, name: c?.clienteFinal })}
                      >
                        <Unlink size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Confirmar desvínculo */}
      <ConfirmDialog
        open={!!unlinkTarget}
        onClose={() => setUnlinkTarget(null)}
        onConfirm={() => unlinkTarget && unlinkMutation.mutate({ contractId: unlinkTarget.contractId })}
        title="Desvincular contrato"
        description={`Remover "${unlinkTarget?.name}" deste servidor? O custo proporcional será zerado neste contrato e recalculado nos demais ativos.`}
        confirmLabel="Desvincular"
        danger
      />
    </div>
  )
}

// ─── Linha expandível de servidor ─────────────────────────────────────────────
function ServerRow({
  server,
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}: {
  server: any
  canEdit: boolean
  canDelete: boolean
  onEdit: (s: any) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const totalContratos = server.contractServers?.length || server._count?.contractServers || 0

  return (
    <>
      <tr className={clsx(expanded && 'bg-slate-800/30')}>
        <td>
          <div className="flex items-center gap-2">
            <button
              className="text-slate-500 hover:text-slate-200 transition-colors"
              onClick={() => setExpanded(!expanded)}
              title={expanded ? 'Recolher' : 'Ver contratos vinculados'}
            >
              {expanded
                ? <ChevronDown size={15} />
                : <ChevronRight size={15} />
              }
            </button>
            <div>
              <p className="font-medium text-slate-200">{server.name}</p>
              {server.url && <p className="text-xs text-slate-500 font-mono">{server.url}</p>}
            </div>
          </div>
        </td>
        <td className="font-mono text-xs text-slate-400">{server.publicIp || '—'}</td>
        <td>{server.ramGb} GB</td>
        <td>{server.vcpu}</td>
        <td>{server.storageGb} GB</td>
        <td><Currency value={Number(server.monthlyCost)} /></td>
        <td><Currency value={Number(server.monthlyRevenue)} colored /></td>
        <td>
          <button
            className="flex items-center gap-1.5 text-slate-300 hover:text-blue-300 transition-colors"
            onClick={() => setExpanded(!expanded)}
            title="Ver contratos"
          >
            <Users size={13} />
            <span>{totalContratos}</span>
          </button>
        </td>
        <td>
          <span className={clsx('badge', server.status === 'ACTIVE' ? 'badge-green' : 'badge-gray')}>
            {server.status === 'ACTIVE' ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        {canEdit && (
          <td>
            <div className="flex gap-1">
              <button className="btn-ghost text-xs p-1.5" onClick={() => onEdit(server)}>
                <Edit2 size={13} />
              </button>
              {canDelete && (
                <button
                  className="btn-ghost text-xs p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={() => onDelete(server.id)}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </td>
        )}
      </tr>

      {/* Painel expandido de contratos */}
      {expanded && (
        <tr>
          <td
            colSpan={canEdit ? 10 : 9}
            className="px-4 py-3 bg-slate-900/60 border-b border-slate-700"
          >
            <ServerContractsPanel server={server} canEdit={canEdit} />
          </td>
        </tr>
      )}
    </>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ServersPage() {
  const { can } = useAuthStore()
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ServerForm>(emptyForm)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data, isLoading, error } = useQuery({
    queryKey: ['servers'],
    queryFn: () => api.get('/servers').then(r => r.data),
  })

  const createServer = useMutation({
    mutationFn: (data: any) => api.post('/servers', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servers'] })
      setModalOpen(false)
      setForm(emptyForm)
      toast.success('Servidor criado!')
    },
    onError: () => toast.error('Erro ao criar servidor'),
  })

  const updateServer = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/servers/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servers'] })
      setModalOpen(false)
      setEditingId(null)
      toast.success('Servidor atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar servidor'),
  })

  const deleteServer = useMutation({
    mutationFn: (id: string) => api.delete(`/servers/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['servers'] })
      toast.success('Servidor removido')
    },
    onError: () => toast.error('Erro ao remover servidor'),
  })

  const openCreate = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true) }

  const openEdit = (server: any) => {
    setForm({
      name: server.name, url: server.url || '', publicIp: server.publicIp || '',
      ramGb: server.ramGb, vcpu: server.vcpu, storageGb: server.storageGb,
      monthlyCost: Number(server.monthlyCost), monthlyRevenue: Number(server.monthlyRevenue),
      status: server.status, observation: server.observation || '',
    })
    setEditingId(server.id)
    setModalOpen(true)
  }

  const handleSubmit = () => {
    if (!form.name) { toast.error('Nome é obrigatório'); return }
    if (editingId) updateServer.mutate({ id: editingId, data: form })
    else createServer.mutate(form)
  }

  const { servers = [], summary } = data || {}

  return (
    <div>
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Servidores</h1>
          <p className="page-subtitle">
            Clique em <ChevronRight size={12} className="inline" /> para ver contratos vinculados
          </p>
        </div>
        {can(['MANAGER', 'ADMIN']) && (
          <button className="btn-primary w-fit" onClick={openCreate}>
            <Plus size={15} />
            Novo Servidor
          </button>
        )}
      </div>

      {/* Resumo */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: String(summary.total) },
            { label: 'Ativos', value: String(summary.totalActive) },
            { label: 'Custo Total', value: fmtBrl(summary.totalCost) },
            { label: 'Receita Total', value: fmtBrl(summary.totalRevenue) },
            { label: 'Margem', value: `${summary.margin.toFixed(1)}%` },
          ].map((card, i) => (
            <div key={i} className="stat-card">
              <p className="stat-label">{card.label}</p>
              <p className="stat-value">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading ? (
        <Loading text="Carregando servidores..." />
      ) : error ? (
        <ErrorMsg message="Erro ao carregar servidores" />
      ) : servers.length === 0 ? (
        <Empty title="Nenhum servidor cadastrado" description="Clique em 'Novo Servidor' para começar" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>IP Público</th>
                  <th>RAM</th>
                  <th>vCPU</th>
                  <th>Armazenamento</th>
                  <th>Custo</th>
                  <th>Receita</th>
                  <th>Contratos</th>
                  <th>Status</th>
                  {can(['MANAGER', 'ADMIN']) && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {servers.map((s: any) => (
                  <ServerRow
                    key={s.id}
                    server={s}
                    canEdit={can(['MANAGER', 'ADMIN'])}
                    canDelete={can(['ADMIN'])}
                    onEdit={openEdit}
                    onDelete={(id) => setDeleteId(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal criar/editar */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? 'Editar Servidor' : 'Novo Servidor'}
        size="lg"
      >
        <div className="grid grid-cols-2 gap-4">
          <div className="form-group col-span-2">
            <label className="label">Nome *</label>
            <input className="input" value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">URL</label>
            <input className="input" placeholder="https://..." value={form.url}
              onChange={e => setForm(p => ({ ...p, url: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">IP Público</label>
            <input className="input" value={form.publicIp}
              onChange={e => setForm(p => ({ ...p, publicIp: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="label">RAM (GB)</label>
            <input type="number" className="input" value={form.ramGb}
              onChange={e => setForm(p => ({ ...p, ramGb: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="label">vCPU</label>
            <input type="number" className="input" value={form.vcpu}
              onChange={e => setForm(p => ({ ...p, vcpu: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="label">Armazenamento (GB)</label>
            <input type="number" className="input" value={form.storageGb}
              onChange={e => setForm(p => ({ ...p, storageGb: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="label">Custo Mensal (R$)</label>
            <input type="number" step="0.01" className="input" value={form.monthlyCost}
              onChange={e => setForm(p => ({ ...p, monthlyCost: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="label">Receita Mensal (R$)</label>
            <input type="number" step="0.01" className="input" value={form.monthlyRevenue}
              onChange={e => setForm(p => ({ ...p, monthlyRevenue: Number(e.target.value) }))} />
          </div>
          <div className="form-group">
            <label className="label">Status</label>
            <select className="select" value={form.status}
              onChange={e => setForm(p => ({ ...p, status: e.target.value as any }))}>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
          </div>
          <div className="form-group col-span-2">
            <label className="label">Observação</label>
            <textarea className="input h-20 resize-none" value={form.observation}
              onChange={e => setForm(p => ({ ...p, observation: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-4">
          <button className="btn-ghost" onClick={() => setModalOpen(false)}>Cancelar</button>
          <button
            className="btn-primary"
            disabled={createServer.isPending || updateServer.isPending}
            onClick={handleSubmit}
          >
            {editingId ? 'Salvar alterações' : 'Criar servidor'}
          </button>
        </div>
      </Modal>

      {/* Confirm delete servidor */}
      <ConfirmDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteServer.mutate(deleteId)}
        title="Remover servidor"
        description="Tem certeza? Todos os contratos serão desvinculados e os custos zerados."
        confirmLabel="Remover"
        danger
      />
    </div>
  )
}
