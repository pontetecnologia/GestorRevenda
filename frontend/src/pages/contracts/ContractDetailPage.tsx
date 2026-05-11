import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, ExternalLink, Copy, Check, Edit2, Save, X,
  Globe, DollarSign, Lock, LockOpen, Wrench, History, AlertTriangle,
  Plus, Trash2, ArrowRightLeft, Link2, Unlink, Server as ServerIcon, RefreshCw,
} from 'lucide-react'
import api from '../../services/api'
import { Loading, ErrorMsg, StatusBadge, Currency, Modal, ConfirmDialog } from '../../components/ui'
import { useAuthStore } from '../../store/auth.store'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Tab = 'geral' | 'financeiro' | 'status' | 'acesso' | 'tecnico'

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'geral', label: 'Geral', icon: Globe },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'status', label: 'Status & Bloqueio', icon: Lock },
  { id: 'acesso', label: 'Acesso Web', icon: ExternalLink },
  { id: 'tecnico', label: 'Dados Técnicos', icon: Wrench },
]

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handleCopy}
      className="btn-ghost text-xs p-1.5"
      title="Copiar"
    >
      {copied ? <Check size={13} className="text-green-400" /> : <Copy size={13} />}
    </button>
  )
}

function InfoRow({ label, value, mono }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 py-2 border-b border-slate-800 last:border-0">
      <span className="text-xs text-slate-500 sm:w-48 shrink-0">{label}</span>
      <span className={clsx('text-sm text-slate-200', mono && 'font-mono')}>{value || '—'}</span>
    </div>
  )
}

// ─── Componente de Vínculo de Servidor ───────────────────────────────────────
function ServerSection({
  contract,
  canEdit,
  isSupport,
}: {
  contract: any
  canEdit: boolean
  isSupport: boolean
}) {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmUnlink, setConfirmUnlink] = useState(false)

  const vinculado = contract.contractServers?.[0]?.server ?? null

  // Busca lista de servidores ativos
  const { data: serversData } = useQuery({
    queryKey: ['servers-list'],
    queryFn: () => api.get('/servers').then(r => r.data),
    enabled: modalOpen,
  })
  const servers = serversData?.servers?.filter((s: any) => s.status === 'ACTIVE') ?? []

  const linkMutation = useMutation({
    mutationFn: (serverId: string) =>
      api.post(`/contracts/${contract.id}/link-server`, { serverId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract', contract.id] })
      qc.invalidateQueries({ queryKey: ['servers'] })
      setModalOpen(false)
      toast.success('Servidor vinculado! Custos recalculados automaticamente.')
    },
    onError: () => toast.error('Erro ao vincular servidor'),
  })

  const unlinkMutation = useMutation({
    mutationFn: () =>
      api.post(`/contracts/${contract.id}/unlink-server`, { serverId: vinculado?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract', contract.id] })
      qc.invalidateQueries({ queryKey: ['servers'] })
      setConfirmUnlink(false)
      toast.success('Servidor desvinculado. Custos recalculados.')
    },
    onError: () => toast.error('Erro ao desvincular servidor'),
  })

  // Só exibe para contratos Web
  if (contract.tipoContrato?.toLowerCase() !== 'web') {
    return (
      <div className="card">
        <div className="flex items-center gap-2 mb-2">
          <ServerIcon size={16} className="text-slate-400" />
          <h3 className="font-semibold text-slate-100">Servidor</h3>
        </div>
        <p className="text-sm text-slate-500">
          Vínculo de servidor disponível apenas para contratos do tipo <span className="text-slate-300">Web</span>.
        </p>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ServerIcon size={16} className="text-blue-400" />
          <h3 className="font-semibold text-slate-100">Servidor</h3>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            {vinculado ? (
              <button
                className="btn-ghost text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={() => setConfirmUnlink(true)}
              >
                <Unlink size={13} />
                Desvincular
              </button>
            ) : null}
            <button
              className="btn-secondary text-xs"
              onClick={() => setModalOpen(true)}
            >
              <Link2 size={13} />
              {vinculado ? 'Trocar servidor' : 'Vincular servidor'}
            </button>
          </div>
        )}
      </div>

      {!vinculado ? (
        <div className="flex items-center gap-2 text-slate-500 text-sm py-2">
          <ServerIcon size={14} />
          <span>Nenhum servidor vinculado.</span>
          {canEdit && (
            <button
              className="text-blue-400 hover:text-blue-300 underline text-xs ml-1"
              onClick={() => setModalOpen(true)}
            >
              Vincular agora
            </button>
          )}
        </div>
      ) : (
        <div className="p-3 bg-blue-900/10 border border-blue-700/20 rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium text-blue-300">{vinculado.name}</p>
              {vinculado.url && (
                <p className="text-xs font-mono text-slate-500 mt-0.5">{vinculado.url}</p>
              )}
              {vinculado.publicIp && (
                <p className="text-xs text-slate-500 mt-0.5">IP: {vinculado.publicIp}</p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-slate-400">
                <span>{vinculado.ramGb} GB RAM</span>
                <span>{vinculado.vcpu} vCPU</span>
                <span>{vinculado.storageGb} GB disco</span>
              </div>
            </div>
            <div className="text-right">
              {!isSupport && (
                <>
                  <p className="text-xs text-slate-500">Custo total do servidor</p>
                  <p className="text-sm font-bold text-slate-200">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(vinculado.monthlyCost))}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {contract.contractServers?.length > 0
                      ? `÷ contratos vinculados = custo proporcional`
                      : ''}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal selecionar servidor */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Vincular servidor"
        size="md"
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Selecione o servidor. O custo será dividido automaticamente entre todos
            os contratos vinculados ao servidor escolhido.
          </p>

          {servers.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-sm">
              Nenhum servidor ativo cadastrado. Cadastre em{' '}
              <span className="text-blue-400">Servidores</span>.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {servers.map((s: any) => {
                const qtdVinculados = s._count?.contractServers ?? s.contractServers?.length ?? 0
                const custoUnitario = qtdVinculados > 0
                  ? Number(s.monthlyCost) / (qtdVinculados + (vinculado?.id === s.id ? 0 : 1))
                  : Number(s.monthlyCost)
                const fmtBrl = (v: number) =>
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

                return (
                  <button
                    key={s.id}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all',
                      vinculado?.id === s.id
                        ? 'border-blue-500 bg-blue-900/20 text-blue-300'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800',
                    )}
                    disabled={linkMutation.isPending}
                    onClick={() => linkMutation.mutate(s.id)}
                  >
                    <ServerIcon size={18} className="text-blue-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-200">{s.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{s.publicIp || s.url || '—'}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {s.ramGb}GB RAM · {s.vcpu} vCPU · {qtdVinculados} contrato(s) vinculado(s)
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {!isSupport && (
                        <>
                          <p className="text-xs text-slate-500">Custo total</p>
                          <p className="text-sm font-bold text-slate-200">{fmtBrl(Number(s.monthlyCost))}</p>
                          <p className="text-xs text-green-400 mt-0.5">
                            ≈ {fmtBrl(custoUnitario)} / contrato
                          </p>
                        </>
                      )}
                    </div>
                    {vinculado?.id === s.id && (
                      <Check size={16} className="text-blue-400 shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button className="btn-ghost" onClick={() => setModalOpen(false)}>
              Fechar
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmar desvinculação */}
      <ConfirmDialog
        open={confirmUnlink}
        onClose={() => setConfirmUnlink(false)}
        onConfirm={() => unlinkMutation.mutate()}
        title="Desvincular servidor"
        description={`Remover o vínculo com "${vinculado?.name}"? O custo do servidor será zerado neste contrato e recalculado nos demais.`}
        confirmLabel="Desvincular"
        danger
      />
    </div>
  )
}

// ─── Componente de Migração ───────────────────────────────────────────────────
function MigrationSection({
  contract,
  canEdit,
}: {
  contract: any
  canEdit: boolean
}) {
  const qc = useQueryClient()

  // Modo A: contrato NOVO busca o antigo
  const [modalAntigoOpen, setModalAntigoOpen] = useState(false)
  // Modo B: contrato ANTIGO busca o novo
  const [modalNovoOpen, setModalNovoOpen] = useState(false)

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedContract, setSelectedContract] = useState<any | null>(null)
  const [motivo, setMotivo] = useState('')
  const [dataMigracao, setDataMigracao] = useState(
    new Date().toISOString().split('T')[0],
  )

  const isAtivo  = [1, 3, 5].includes(contract.idStatus)  // Aberto/Bloqueado/Degustação
  const isAntigo = [2, 4].includes(contract.idStatus)     // Encerrado/Migrado

  // schema:
  //   contract.migrations    → relation "NewContract" → este é o newContractId → NOVO (substituto, ativo)
  //   contract.oldMigrations → relation "OldContract" → este é o oldContractId → ANTIGO (encerrado)
  const esteEhNovo   = contract.migrations    || []  // este é o NOVO que substituiu algum antigo
  const esteEhAntigo = contract.oldMigrations || []  // este é o ANTIGO que foi substituído

  const modalOpen = modalAntigoOpen || modalNovoOpen

  // Modo A (contrato ATIVO — é o NOVO): busca o contrato antigo que ele substituiu
  // Modo B (contrato ANTIGO — foi substituído): busca o contrato novo que o substituiu
  const searchStatuses = modalAntigoOpen ? '2,4' : '1,3,5'
  const { data: searchResults, isFetching } = useQuery({
    queryKey: ['contract-search-migration', searchTerm, searchStatuses],
    queryFn: () =>
      api.get('/contracts', {
        params: { search: searchTerm, idStatuses: searchStatuses, limit: 20 },
      }).then((r) => r.data.data || []),
    enabled: searchTerm.length >= 2,
    staleTime: 10000,
  })

  const closeModal = () => {
    setModalAntigoOpen(false)
    setModalNovoOpen(false)
    setSelectedContract(null)
    setSearchTerm('')
    setMotivo('')
  }

  const createMigration = useMutation({
    mutationFn: () => {
      // Modo A (este é NOVO, aberto): este substituiu o selecionado (antigo)
      // Modo A (este é ATIVO/NOVO, modalAntigoOpen):
      //   busca um encerrado → old = selecionado (encerrado), new = este (ativo)
      // Modo B (este é ANTIGO, modalNovoOpen):
      //   busca um ativo → old = este (encerrado), new = selecionado (ativo)
      const payload = modalAntigoOpen
        ? { oldContractId: selectedContract.id, newContractId: contract.id }
        : { oldContractId: contract.id,          newContractId: selectedContract.id }

      return api.post(`/contracts/${contract.id}/migration`, {
        ...payload,
        motivoMigracao: motivo || null,
        dataMigracao,
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract', contract.id] })
      qc.invalidateQueries({ queryKey: ['contracts'] })
      closeModal()
      toast.success('Vínculo de migração registrado!')
    },
    onError: () => toast.error('Erro ao registrar migração'),
  })

  const modalTitle = modalAntigoOpen
    ? 'Vincular contrato que este substituiu'
    : 'Informar contrato que substituiu este'

  const modalDesc = modalAntigoOpen
    ? `O contrato "${contract.clienteFinal}" está ativo. Selecione abaixo o contrato ENCERRADO ou MIGRADO que este substituiu — indicando que é uma continuação, não um novo cliente.`
    : `O contrato "${contract.clienteFinal}" está encerrado/migrado. Selecione abaixo o contrato ABERTO que o substituiu.`

  const searchPlaceholder = modalAntigoOpen
    ? 'Buscar contrato encerrado ou migrado que este substituiu...'
    : 'Buscar contrato aberto que substituiu este...'

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={16} className="text-blue-400" />
          <h3 className="font-semibold text-slate-100">Migração</h3>
        </div>

        <div className="flex gap-2">
          {/* Contrato ATIVO (é o NOVO): pode vincular o antigo que ele substituiu */}
          {canEdit && isAtivo && esteEhNovo.length === 0 && (
            <button className="btn-secondary text-xs" onClick={() => setModalAntigoOpen(true)}>
              <Link2 size={13} />
              Vincular contrato anterior
            </button>
          )}

          {/* Contrato ANTIGO (Encerrado/Migrado): pode indicar o novo que o substituiu */}
          {canEdit && isAntigo && esteEhAntigo.length === 0 && (
            <button className="btn-secondary text-xs" onClick={() => setModalNovoOpen(true)}>
              <Link2 size={13} />
              Informar contrato substituto
            </button>
          )}
        </div>
      </div>

      {/* Estado vazio */}
      {esteEhNovo.length === 0 && esteEhAntigo.length === 0 ? (
        <div className="flex flex-col gap-2 text-slate-500 text-sm py-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={14} />
            <span>Nenhum vínculo de migração registrado.</span>
          </div>
          {canEdit && (
            <div className="flex gap-2 mt-1">
              {isAtivo && (
                <button
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  onClick={() => setModalAntigoOpen(true)}
                >
                  Vincular contrato anterior que este substituiu
                </button>
              )}
              {isAntigo && (
                <button
                  className="text-blue-400 hover:text-blue-300 underline text-xs"
                  onClick={() => setModalNovoOpen(true)}
                >
                  Informar contrato que substituiu este
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">

          {/* Este contrato é o NOVO — substituiu um antigo */}
          {esteEhNovo.length > 0 && (
            <div>
              <p className="section-title text-xs mb-2">
                🔄 Este contrato substituiu:
              </p>
              {esteEhNovo.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-start gap-3 p-3 bg-blue-900/10 border border-blue-700/20 rounded-lg"
                >
                  <ArrowRightLeft size={16} className="text-blue-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-blue-300">{m.oldContract?.clienteFinal}</p>
                    <p className="text-xs font-mono text-slate-500">{m.oldContract?.cpfCnpj}</p>
                    {m.motivoMigracao && (
                      <p className="text-xs text-slate-400 mt-1">
                        <span className="text-slate-500">Motivo:</span> {m.motivoMigracao}
                      </p>
                    )}
                    {m.dataMigracao && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Data: {new Date(m.dataMigracao).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {m.createdByUser && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Registrado por: {m.createdByUser.name}
                      </p>
                    )}
                  </div>
                  <span className="badge badge-blue text-xs shrink-0">Contrato anterior</span>
                </div>
              ))}
            </div>
          )}

          {/* Este contrato é o ANTIGO — foi substituído por outro */}
          {esteEhAntigo.length > 0 && (
            <div>
              <p className="section-title text-xs mb-2">
                ➡️ Este contrato foi substituído por:
              </p>
              {esteEhAntigo.map((m: any) => (
                <div
                  key={m.id}
                  className="flex items-start gap-3 p-3 bg-slate-800/60 border border-slate-700/40 rounded-lg"
                >
                  <ArrowRightLeft size={16} className="text-slate-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-300">{m.newContract?.clienteFinal}</p>
                    <p className="text-xs font-mono text-slate-500">{m.newContract?.cpfCnpj}</p>
                    {m.motivoMigracao && (
                      <p className="text-xs text-slate-400 mt-1">
                        <span className="text-slate-500">Motivo:</span> {m.motivoMigracao}
                      </p>
                    )}
                    {m.dataMigracao && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Data: {new Date(m.dataMigracao).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                    {m.createdByUser && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Registrado por: {m.createdByUser.name}
                      </p>
                    )}
                  </div>
                  <span className="badge badge-gray text-xs shrink-0">Substituído</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal unificado (muda comportamento por modo) */}
      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={modalTitle}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg text-xs text-blue-300">
            <p className="font-medium mb-1">📋 Como funciona</p>
            <p>{modalDesc}</p>
          </div>

          {/* Busca */}
          <div className="form-group">
            <label className="label">{searchPlaceholder.replace('...', '')}</label>
            <input
              className="input"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setSelectedContract(null) }}
            />
            {searchTerm.length > 0 && searchTerm.length < 2 && (
              <p className="text-xs text-slate-500 mt-1">Digite pelo menos 2 caracteres</p>
            )}
          </div>

          {/* Resultados */}
          {searchTerm.length >= 2 && (
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              {isFetching ? (
                <div className="p-3 text-center text-slate-500 text-sm">Buscando...</div>
              ) : !searchResults || searchResults.length === 0 ? (
                <div className="p-3 text-center text-slate-500 text-sm">
                  Nenhum contrato encontrado
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto divide-y divide-slate-800">
                  {searchResults
                    .filter((c: any) => c.id !== contract.id) // Excluir o próprio contrato
                    .map((c: any) => (
                    <button
                      key={c.id}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-800 transition-colors',
                        selectedContract?.id === c.id && 'bg-blue-900/30 border-l-2 border-blue-500',
                      )}
                      onClick={() => setSelectedContract(c)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">{c.clienteFinal}</p>
                        <p className="text-xs text-slate-500 font-mono">{c.cpfCnpj}</p>
                      </div>
                      <StatusBadge idStatus={c.idStatus} />
                      {selectedContract?.id === c.id && (
                        <Check size={14} className="text-blue-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selecionado */}
          {selectedContract && (
            <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg text-sm">
              <p className="text-xs text-green-400 font-medium mb-1">✅ Contrato selecionado</p>
              <p className="text-slate-200 font-medium">{selectedContract.clienteFinal}</p>
              <p className="text-xs text-slate-500 font-mono">{selectedContract.cpfCnpj}</p>
            </div>
          )}

          {/* Motivo e data */}
          <div className="form-group">
            <label className="label">
              Motivo <span className="text-slate-500">(opcional)</span>
            </label>
            <input
              className="input"
              placeholder="Ex: Mudança de CNPJ, upgrade, fusão..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Data da migração</label>
            <input
              type="date"
              className="input"
              value={dataMigracao}
              onChange={(e) => setDataMigracao(e.target.value)}
            />
          </div>

          <div className="flex gap-3 justify-end pt-1">
            <button className="btn-ghost" onClick={closeModal}>Cancelar</button>
            <button
              className="btn-primary"
              disabled={!selectedContract || createMigration.isPending}
              onClick={() => createMigration.mutate()}
            >
              <Link2 size={13} />
              {createMigration.isPending ? 'Salvando...' : 'Registrar vínculo'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { can, user } = useAuthStore()
  const isSupport = user?.role === 'SUPPORT'
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('geral')
  const [editingFinancial, setEditingFinancial] = useState(false)
  const [financialForm, setFinancialForm] = useState<Record<string, number>>({})
  const [accessModal, setAccessModal] = useState(false)
  const [confirmBloqueio, setConfirmBloqueio] = useState(false)
  const [confirmDesbloqueio, setConfirmDesbloqueio] = useState(false)
  const [resultModal, setResultModal] = useState<{ success: boolean; message: string } | null>(null)

  const { data: contract, isLoading, error } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => api.get(`/contracts/${id}`).then(r => r.data),
  })

  const updateFinancial = useMutation({
    mutationFn: (data: any) => api.put(`/contracts/${id}/financial`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contract', id] })
      setEditingFinancial(false)
      toast.success('Dados financeiros atualizados!')
    },
    onError: () => toast.error('Erro ao atualizar dados financeiros'),
  })

  const logAccess = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/access-log`, {}),
  })

  const bloqueioMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/bloquear`).then(r => r.data),
    onSuccess: (data) => {
      setConfirmBloqueio(false)
      setResultModal(data)
      if (data.success) {
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ['contract', id] })
          qc.invalidateQueries({ queryKey: ['contracts'] })
        }, 6000)
      }
    },
    onError: (err: any) => {
      setConfirmBloqueio(false)
      setResultModal({ success: false, message: err?.response?.data?.message || 'Erro ao comunicar com a API Intelidata' })
    },
  })

  const desbloqueioMutation = useMutation({
    mutationFn: () => api.post(`/contracts/${id}/desbloquear`).then(r => r.data),
    onSuccess: (data) => {
      setConfirmDesbloqueio(false)
      setResultModal(data)
      if (data.success) {
        setTimeout(() => {
          qc.invalidateQueries({ queryKey: ['contract', id] })
          qc.invalidateQueries({ queryKey: ['contracts'] })
        }, 6000)
      }
    },
    onError: (err: any) => {
      setConfirmDesbloqueio(false)
      setResultModal({ success: false, message: err?.response?.data?.message || 'Erro ao comunicar com a API Intelidata' })
    },
  })

  if (isLoading) return <Loading text="Carregando contrato..." />
  if (error || !contract) return <ErrorMsg message="Erro ao carregar contrato" />

  const f = contract.financial || {}
  const receita = (Number(f.valorVenda) || 0) + (Number(f.valorVendaTef) || 0) + (Number(f.valorVendaServidor) || 0) + (Number(f.outrasReceitas) || 0)
  const custo = (Number(f.valorCustoIntelidata) || Number(contract.valortotal)) + (Number(f.custoTef) || 0) + (Number(f.custoServidor) || 0) + (Number(f.outrosCustos) || 0)
  const liquido = receita - custo
  const margemPct = receita > 0 ? (liquido / receita) * 100 : 0

  const startEdit = () => {
    setFinancialForm({
      valorVenda:         Number(f.valorVenda)         || 0,
      valorVendaTef:      Number(f.valorVendaTef)      || 0,
      valorVendaServidor: Number(f.valorVendaServidor) || 0,
      outrasReceitas:     Number(f.outrasReceitas)     || 0,
      custoTef:           Number(f.custoTef)           || 0,
      outrosCustos:       Number(f.outrosCustos)       || 0,
    })
    setEditingFinancial(true)
  }

  const handleAccessWeb = () => {
    if (contract.webAccessUrl) {
      logAccess.mutate()
      window.open(contract.webAccessUrl, '_blank')
    }
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'
  
  const fmtDateTime = (d: string | null) =>
    d ? new Date(d).toLocaleString('pt-BR') : '—'

  // Lógica dos botões de bloqueio
  const isAberto      = contract.idStatus === 1
  const isBloqueado   = contract.idStatus === 3
  const emBloqueio    = contract.diasParaBloqueio > 0
  const mostrarBloqueio    = isAberto && !emBloqueio
  const mostrarDesbloqueio = isBloqueado || emBloqueio

  return (
    <div>
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button className="btn-ghost" onClick={() => navigate('/contratos')}>
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="page-title truncate">{contract.clienteFinal}</h1>
          <div className="flex items-center gap-3 mt-1">
            <span className="font-mono text-sm text-slate-400">{contract.cpfCnpj}</span>
            <StatusBadge idStatus={contract.idStatus} />
            <span className={clsx(
              'badge',
              contract.tipoContrato?.toLowerCase() === 'web' ? 'badge-blue' : 'badge-gray'
            )}>
              {contract.tipoContrato || '—'}
            </span>
          </div>
        </div>

        {/* Botões de ação no header */}
        <div className="flex gap-2 items-center shrink-0">
          {/* Botão Solicitar Bloqueio — Aberto sem bloqueio agendado */}
          {mostrarBloqueio && (
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-orange-600/50 bg-orange-900/20 text-orange-400 hover:bg-orange-900/40 transition-colors whitespace-nowrap"
              onClick={() => setConfirmBloqueio(true)}
              disabled={bloqueioMutation.isPending}
            >
              <Lock size={14} />
              Solicitar Bloqueio
            </button>
          )}

          {/* Botão Solicitar Desbloqueio — Bloqueado ou Em Bloqueio */}
          {mostrarDesbloqueio && (
            <button
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border border-green-600/50 bg-green-900/20 text-green-400 hover:bg-green-900/40 transition-colors whitespace-nowrap"
              onClick={() => setConfirmDesbloqueio(true)}
              disabled={desbloqueioMutation.isPending}
            >
              <LockOpen size={14} />
              Solicitar Desbloqueio
            </button>
          )}

          {/* Botão Acessar Sistema */}
          {contract.tipoContrato?.toLowerCase() === 'web' && contract.webAccessUrl && (
            <button
              className="btn-primary whitespace-nowrap"
              onClick={handleAccessWeb}
            >
              <Globe size={15} />
              Acessar Sistema
            </button>
          )}
        </div>
      </div>

      {/* Modal Confirmar Bloqueio */}
      <Modal
        open={confirmBloqueio}
        onClose={() => setConfirmBloqueio(false)}
        title="Solicitar Bloqueio"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-orange-900/20 border border-orange-700/30 rounded-lg text-sm text-orange-300">
            <p className="font-medium mb-1">⚠ Atenção</p>
            <p>
              Isso irá <strong>agendar o bloqueio</strong> do contrato de{' '}
              <strong>{contract.clienteFinal}</strong> no Portal Intelidata.
            </p>
            <p className="mt-1 text-xs text-orange-400">
              O bloqueio será executado em <strong>10 dias</strong> conforme rotina padrão.
              Um e-mail de notificação será enviado automaticamente.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-ghost" onClick={() => setConfirmBloqueio(false)}>
              Cancelar
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white transition-colors"
              disabled={bloqueioMutation.isPending}
              onClick={() => bloqueioMutation.mutate()}
            >
              <Lock size={14} />
              {bloqueioMutation.isPending ? 'Enviando...' : 'Confirmar Bloqueio'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Desbloqueio */}
      <Modal
        open={confirmDesbloqueio}
        onClose={() => setConfirmDesbloqueio(false)}
        title="Solicitar Desbloqueio"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-green-900/20 border border-green-700/30 rounded-lg text-sm text-green-300">
            <p className="font-medium mb-1">✅ Desbloqueio / Cancelar Agendamento</p>
            <p>
              Isso irá <strong>desbloquear</strong> ou <strong>cancelar o agendamento de bloqueio</strong> do contrato de{' '}
              <strong>{contract.clienteFinal}</strong> no Portal Intelidata.
            </p>
            <p className="mt-1 text-xs text-green-400">
              Um e-mail de notificação será enviado automaticamente.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button className="btn-ghost" onClick={() => setConfirmDesbloqueio(false)}>
              Cancelar
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
              disabled={desbloqueioMutation.isPending}
              onClick={() => desbloqueioMutation.mutate()}
            >
              <LockOpen size={14} />
              {desbloqueioMutation.isPending ? 'Enviando...' : 'Confirmar Desbloqueio'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Resultado da ação */}
      <Modal
        open={!!resultModal}
        onClose={() => setResultModal(null)}
        title={resultModal?.success ? 'Solicitação Enviada' : 'Erro na Solicitação'}
        size="sm"
      >
        <div className={clsx(
          'p-4 rounded-lg text-sm border mb-4',
          resultModal?.success
            ? 'bg-green-900/20 border-green-700/30 text-green-300'
            : 'bg-red-900/20 border-red-700/30 text-red-300'
        )}>
          <p className="font-medium mb-1">
            {resultModal?.success ? '✅ Sucesso' : '❌ Erro'}
          </p>
          <p className="text-xs leading-relaxed">{resultModal?.message}</p>
        </div>
        {(resultModal as any)?.syncAgendado && (
          <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-800 rounded-lg px-3 py-2 mb-4">
            <RefreshCw size={12} className="animate-spin text-blue-400" />
            Os dados do contrato serão atualizados automaticamente em alguns segundos.
          </div>
        )}
        <div className="flex justify-end">
          <button className="btn-primary" onClick={() => setResultModal(null)}>
            Fechar
          </button>
        </div>
      </Modal>

      {/* Tabs */}
      <div className="tabs-container overflow-x-auto">
        {TABS
          .filter(t => !(t.id === 'financeiro' && isSupport))
          .map(t => (
            <button
              key={t.id}
              className={tab === t.id ? 'tab-active' : 'tab'}
              onClick={() => setTab(t.id)}
            >
              <t.icon size={14} className="inline mr-1.5" />
              {t.label}
            </button>
          ))
        }
      </div>

      {/* Tab: Geral */}
      {tab === 'geral' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card space-y-0">
            <InfoRow label="Razão Social" value={contract.clienteFinal} />
            <InfoRow label="CNPJ/CPF" value={contract.cpfCnpj} mono />
            <InfoRow label="Tipo de Contrato" value={contract.tipoContrato} />
            <InfoRow label="Tipo de Licenciamento" value={contract.tipoLicenciamento} />
            <InfoRow label="Versão do Sistema" value={contract.versaoSistema} />
            <InfoRow label="Build" value={contract.build} mono />
            <InfoRow label="Usuários" value={`${contract.usuarios} usuários`} />
            <InfoRow label="Data de Criação" value={fmtDate(contract.dataCriacao)} />
            <InfoRow label="Último Acesso WS" value={fmtDateTime(contract.ultimoAcessoWs)} />
          </div>

          {/* Seção de Servidor */}
          <ServerSection contract={contract} canEdit={can(['MANAGER', 'ADMIN'])} isSupport={isSupport} />

          {/* Seção de Migração */}
          <MigrationSection contract={contract} canEdit={can(['MANAGER', 'ADMIN'])} />
        </div>
      )}

      {/* Tab: Financeiro */}
      {tab === 'financeiro' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-100">Dados Financeiros</h3>
              {can(['MANAGER', 'ADMIN']) && !editingFinancial && (
                <button className="btn-secondary text-xs" onClick={startEdit}>
                  <Edit2 size={13} />
                  Editar
                </button>
              )}
            </div>

            {editingFinancial ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: 'valorVenda',         label: 'Valor de Venda' },
                    { key: 'valorVendaTef',       label: 'Valor Venda TEF' },
                    { key: 'valorVendaServidor',  label: 'Valor Venda Servidor' },
                    { key: 'outrasReceitas',      label: 'Outras Receitas' },
                    { key: 'custoTef',            label: 'Custo TEF' },
                    { key: 'outrosCustos',        label: 'Outros Custos' },
                  ].map(field => (
                    <div key={field.key} className="form-group">
                      <label className="label">{field.label}</label>
                      <input
                        type="number"
                        step="0.01"
                        className="input"
                        value={financialForm[field.key] || ''}
                        onChange={e => setFinancialForm(prev => ({
                          ...prev,
                          [field.key]: parseFloat(e.target.value) || 0,
                        }))}
                      />
                    </div>
                  ))}
                </div>

                {/* Campos automáticos — somente leitura */}
                <div className="mt-2 p-3 bg-slate-800/60 border border-slate-700/50 rounded-lg space-y-2">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">
                    🔒 Campos automáticos (somente leitura)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group">
                      <label className="label text-slate-500">Custo Intelidata (API)</label>
                      <div className="input bg-slate-900/60 text-slate-400 cursor-not-allowed flex items-center">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(contract.valortotal))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="label text-slate-500">Custo Servidor (proporcional)</label>
                      <div className="input bg-slate-900/60 text-slate-400 cursor-not-allowed flex items-center">
                        {contract.contractServers?.length > 0
                          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(f.custoServidor) || 0)
                          : 'Sem servidor vinculado'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button className="btn-ghost" onClick={() => setEditingFinancial(false)}>
                    <X size={14} />
                    Cancelar
                  </button>
                  <button
                    className="btn-primary"
                    disabled={updateFinancial.isPending}
                    onClick={() => updateFinancial.mutate(financialForm)}
                  >
                    <Save size={14} />
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Receitas */}
                <div>
                  <p className="section-title">Receitas</p>
                  <InfoRow label="Valor de Venda" value={<Currency value={Number(f.valorVenda) || 0} colored />} />
                  <InfoRow label="Valor Venda TEF" value={<Currency value={Number(f.valorVendaTef) || 0} />} />
                  <InfoRow label="Valor Venda Servidor" value={<Currency value={Number(f.valorVendaServidor) || 0} />} />
                  <InfoRow label="Outras Receitas" value={<Currency value={Number(f.outrasReceitas) || 0} />} />
                  <div className="pt-2 mt-1 border-t border-slate-700">
                    <InfoRow label="Receita Total" value={<span className="font-bold"><Currency value={receita} colored /></span>} />
                  </div>
                </div>
                {/* Custos */}
                <div>
                  <p className="section-title">Custos</p>
                  <InfoRow label="Custo Intelidata (auto)" value={
                    <span className="flex items-center gap-2">
                      <Currency value={Number(f.valorCustoIntelidata) || Number(contract.valortotal)} />
                      <span className="badge badge-gray text-xs">automático</span>
                    </span>
                  } />
                  <InfoRow label="Custo TEF" value={<Currency value={Number(f.custoTef) || 0} />} />
                  <InfoRow label="Outros Custos" value={<Currency value={Number(f.outrosCustos) || 0} />} />
                  <InfoRow label="Custo Servidor (auto)" value={
                    <span className="flex items-center gap-2">
                      <Currency value={Number(f.custoServidor) || 0} />
                      {contract.contractServers?.length > 0
                        ? <span className="badge badge-gray text-xs">automático</span>
                        : <span className="text-xs text-slate-500 italic">sem servidor</span>
                      }
                    </span>
                  } />
                  <div className="pt-2 mt-1 border-t border-slate-700">
                    <InfoRow label="Custo Total" value={<span className="font-bold text-red-400"><Currency value={custo} /></span>} />
                  </div>
                </div>
              </div>
            )}

            {/* Resultado */}
            {!editingFinancial && (
              <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="stat-label">Valor Líquido</p>
                  <p className={clsx('text-xl font-bold mt-1', liquido >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(liquido)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="stat-label">Margem %</p>
                  <p className={clsx('text-xl font-bold mt-1', margemPct >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {margemPct.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="stat-label">Receita Total</p>
                  <p className="text-xl font-bold text-slate-100 mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(receita)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Status */}
      {tab === 'status' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <h3 className="font-semibold text-slate-100 mb-4">Status Atual</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              {contract.diasParaBloqueio > 0 && (
                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-400 font-medium">⚠ Em Bloqueio</p>
                  <p className="text-lg font-bold text-yellow-300">{contract.diasParaBloqueio} dias</p>
                </div>
              )}
              {contract.diasBloqueado > 0 && (
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                  <p className="text-xs text-red-400 font-medium">🔴 Bloqueado há</p>
                  <p className="text-lg font-bold text-red-300">{contract.diasBloqueado} dias</p>
                </div>
              )}
              {contract.diasParaEncerrar > 0 && (
                <div className="bg-red-900/20 border border-red-700/30 rounded-lg p-3">
                  <p className="text-xs text-red-400 font-medium">Encerrando em</p>
                  <p className="text-lg font-bold text-red-300">{contract.diasParaEncerrar} dias</p>
                </div>
              )}
            </div>
            <InfoRow label="Descrição do Status" value={contract.descricaoStatus} />
            <InfoRow label="Data de Bloqueio" value={fmtDate(contract.databloqueio)} />
            <InfoRow label="Data de Encerramento" value={fmtDate(contract.dataEncerramento)} />
            <InfoRow label="Data de Migração" value={fmtDate(contract.dataMigracao)} />
          </div>

          {/* Histórico de bloqueios */}
          {contract.blockHistory?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
                <History size={16} />
                Histórico de Status
              </h3>
              <div className="space-y-2">
                {contract.blockHistory.map((h: any) => (
                  <div key={h.id} className="flex items-center gap-3 text-sm py-2 border-b border-slate-800 last:border-0">
                    <span className="text-xs text-slate-500 w-32 shrink-0">
                      {fmtDate(h.createdAt)}
                    </span>
                    <span className={clsx(
                      'badge text-xs',
                      h.action === 'BLOCK' ? 'badge-red' : h.action === 'UNBLOCK' ? 'badge-green' : 'badge-blue'
                    )}>
                      {h.action}
                    </span>
                    {h.oldStatus && h.newStatus && (
                      <span className="text-slate-400">{h.oldStatus} → {h.newStatus}</span>
                    )}
                    {h.description && <span className="text-slate-500">{h.description}</span>}
                    {h.createdByUser && <span className="text-slate-500 ml-auto text-xs">{h.createdByUser.name}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Acesso Web */}
      {tab === 'acesso' && (
        <div className="space-y-4 animate-fade-in">
          <div className="card">
            <h3 className="font-semibold text-slate-100 mb-4">Acesso ao Sistema Web</h3>

            {contract.tipoContrato?.toLowerCase() !== 'web' ? (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <AlertTriangle size={16} />
                Este contrato é do tipo Desktop. Sem acesso Web direto.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tenant */}
                <div>
                  <label className="label">Tenant (ID de acesso)</label>
                  <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                    <code className="flex-1 text-blue-300 font-mono text-sm">{contract.tenant}</code>
                    <CopyButton value={contract.tenant || ''} />
                  </div>
                </div>

                {/* Link principal Intelidata */}
                <div>
                  <label className="label">Link Intelidata</label>
                  <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                    <Globe size={14} className="text-slate-500 shrink-0" />
                    <span className="flex-1 text-sm text-slate-300 break-all font-mono">{contract.webAccessUrl}</span>
                    <CopyButton value={contract.webAccessUrl || ''} />
                    <a
                      href={contract.webAccessUrl}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => logAccess.mutate()}
                      className="text-slate-400 hover:text-blue-400 transition-colors"
                      title="Abrir"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>

                {/* Link do servidor vinculado */}
                {(() => {
                  const servidor = contract.contractServers?.[0]?.server
                  if (!servidor?.url || !contract.tenant) return null
                  const serverUrl = `${servidor.url.replace(/\/$/, '')}/?tenant=${contract.tenant}`
                  return (
                    <div>
                      <label className="label">
                        Link Servidor
                        <span className="ml-2 text-slate-500 font-normal normal-case">({servidor.name})</span>
                      </label>
                      <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2">
                        <ServerIcon size={14} className="text-slate-500 shrink-0" />
                        <span className="flex-1 text-sm text-slate-300 break-all font-mono">{serverUrl}</span>
                        <CopyButton value={serverUrl} />
                        <a
                          href={serverUrl}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => logAccess.mutate()}
                          className="text-slate-400 hover:text-blue-400 transition-colors"
                          title="Abrir"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  )
                })()}

                {/* Botão principal */}
                <button className="btn-primary" onClick={handleAccessWeb}>
                  <Globe size={15} />
                  Acessar Sistema WEB
                  <ExternalLink size={13} />
                </button>

                {/* Histórico de acessos */}
                {contract.accessLogs?.length > 0 && (
                  <div className="mt-6">
                    <p className="section-title flex items-center gap-2">
                      <History size={14} />
                      Histórico de Acessos
                    </p>
                    <div className="space-y-1">
                      {contract.accessLogs.slice(0, 10).map((log: any) => (
                        <div key={log.id} className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-800 last:border-0">
                          <span className="text-slate-500 w-32 shrink-0">{fmtDateTime(log.createdAt)}</span>
                          <span className="text-slate-300">{log.user?.name}</span>
                          {log.ip && <span className="text-slate-500 font-mono">{log.ip}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Dados Técnicos */}
      {tab === 'tecnico' && (
        <TechDataTab contractId={id!} canEdit={can(['MANAGER', 'ADMIN']) || isSupport} />
      )}
    </div>
  )
}

// ---- Componente separado para Dados Técnicos ----
function TechDataTab({ contractId, canEdit }: { contractId: string; canEdit: boolean }) {
  const qc = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [form, setForm] = useState({ externalId: '', computerName: '', description: '' })

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['access-data', contractId],
    queryFn: () => api.get(`/contracts/${contractId}/access-data`).then(r => r.data),
  })

  const saveMutation = useMutation({
    mutationFn: () =>
      editingItem
        ? api.put(`/contracts/${contractId}/access-data/${editingItem.id}`, form)
        : api.post(`/contracts/${contractId}/access-data`, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-data', contractId] })
      qc.invalidateQueries({ queryKey: ['contract', contractId] })
      setModalOpen(false)
      setEditingItem(null)
      setForm({ externalId: '', computerName: '', description: '' })
      toast.success(editingItem ? 'Dado técnico atualizado!' : 'Dado técnico incluído!')
    },
    onError: () => toast.error('Erro ao salvar dado técnico'),
  })

  const deleteMutation = useMutation({
    mutationFn: (dataId: string) =>
      api.delete(`/contracts/${contractId}/access-data/${dataId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['access-data', contractId] })
      qc.invalidateQueries({ queryKey: ['contract', contractId] })
      setDeleteTarget(null)
      toast.success('Dado técnico removido!')
    },
    onError: () => toast.error('Erro ao remover dado técnico'),
  })

  const openCreate = () => {
    setForm({ externalId: '', computerName: '', description: '' })
    setEditingItem(null)
    setModalOpen(true)
  }

  const openEdit = (item: any) => {
    setForm({
      externalId: item.externalId || '',
      computerName: item.computerName || '',
      description: item.description || '',
    })
    setEditingItem(item)
    setModalOpen(true)
  }

  return (
    <div className="card animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-100">Dados Técnicos</h3>
        {canEdit && (
          <button className="btn-primary text-xs" onClick={openCreate}>
            <Plus size={13} />
            Incluir
          </button>
        )}
      </div>

      {isLoading ? (
        <Loading size="sm" />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
          <Wrench size={32} />
          <p className="text-sm">Nenhum dado técnico cadastrado.</p>
          {canEdit && (
            <button className="btn-secondary text-xs" onClick={openCreate}>
              <Plus size={13} />
              Incluir primeiro registro
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((d: any) => (
            <div
              key={d.id}
              className="bg-slate-800 border border-slate-700/50 rounded-lg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-2">
                  {d.externalId && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-36 shrink-0">ID Acesso</span>
                      <code className="text-xs font-mono text-blue-300 bg-slate-900 px-2 py-0.5 rounded flex-1">
                        {d.externalId}
                      </code>
                      <CopyButton value={d.externalId} />
                    </div>
                  )}
                  {d.computerName && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500 w-36 shrink-0">Nome do Computador</span>
                      <span className="text-sm text-slate-200">{d.computerName}</span>
                    </div>
                  )}
                  {d.description && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-slate-500 w-36 shrink-0 mt-0.5">Descrição</span>
                      <span className="text-sm text-slate-300">{d.description}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-36 shrink-0">Criado em</span>
                    <span className="text-xs text-slate-500">
                      {new Date(d.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      className="btn-ghost text-xs p-1.5"
                      title="Editar"
                      onClick={() => openEdit(d)}
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      className="btn-ghost text-xs p-1.5 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      title="Remover"
                      onClick={() => setDeleteTarget(d.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal incluir/editar */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingItem(null) }}
        title={editingItem ? 'Editar Dado Técnico' : 'Incluir Dado Técnico'}
        size="sm"
      >
        <div className="space-y-4">
          <div className="form-group">
            <label className="label">ID Acesso</label>
            <input
              className="input font-mono"
              placeholder="Ex: 12345"
              value={form.externalId}
              onChange={e => setForm(p => ({ ...p, externalId: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="label">Nome do Computador</label>
            <input
              className="input"
              placeholder="Ex: PC-FINANCEIRO-01"
              value={form.computerName}
              onChange={e => setForm(p => ({ ...p, computerName: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="label">Descrição / Observação</label>
            <textarea
              className="input h-24 resize-none"
              placeholder="Informações adicionais sobre este acesso..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
            />
          </div>

          {!form.externalId && !form.computerName && !form.description && (
            <p className="text-xs text-yellow-400">Preencha pelo menos um campo.</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button
              className="btn-ghost"
              onClick={() => { setModalOpen(false); setEditingItem(null) }}
            >
              Cancelar
            </button>
            <button
              className="btn-primary"
              disabled={
                saveMutation.isPending ||
                (!form.externalId && !form.computerName && !form.description)
              }
              onClick={() => saveMutation.mutate()}
            >
              <Save size={13} />
              {saveMutation.isPending ? 'Salvando...' : editingItem ? 'Salvar' : 'Incluir'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmar exclusão */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
        title="Remover dado técnico"
        description="Tem certeza que deseja remover este registro? Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        danger
      />
    </div>
  )
}
