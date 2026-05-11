import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Eye, RefreshCw, ChevronDown, ArrowRightLeft, Globe } from 'lucide-react'
import api from '../../services/api'
import { Loading, ErrorMsg, StatusBadge, Currency, Pagination, Empty } from '../../components/ui'
import { useAuthStore } from '../../store/auth.store'
import clsx from 'clsx'

// ─── Definição dos grupos de status ───────────────────────────────────────────

interface StatusGroup {
  id: string
  label: string
  idStatuses: number[]
  badgeClass: string
}

const STATUS_GROUPS: StatusGroup[] = [
  {
    id: 'ativos',
    label: 'Ativos',
    idStatuses: [1, 3, 5],
    badgeClass: 'bg-green-900/40 border border-green-700/40 text-green-300',
  },
  {
    id: 'encerramento',
    label: 'Em Encerramento',
    idStatuses: [2],        // filtrado no backend com diasParaEncerrar > 0
    badgeClass: 'bg-orange-900/40 border border-orange-700/40 text-orange-300',
  },
  {
    id: 'aberto',
    label: 'Aberto',
    idStatuses: [1],
    badgeClass: 'bg-emerald-900/40 border border-emerald-700/40 text-emerald-300',
  },
  {
    id: 'bloqueado',
    label: 'Bloqueado',
    idStatuses: [3],
    badgeClass: 'bg-red-900/40 border border-red-700/40 text-red-300',
  },
  {
    id: 'degustacao',
    label: 'Degustação',
    idStatuses: [5],
    badgeClass: 'bg-yellow-900/40 border border-yellow-700/40 text-yellow-300',
  },
  {
    id: 'encerrado',
    label: 'Encerrado',
    idStatuses: [2],
    badgeClass: 'bg-slate-700/60 border border-slate-600/40 text-slate-400',
  },
  {
    id: 'migrado',
    label: 'Migrado',
    idStatuses: [4],
    badgeClass: 'bg-blue-900/40 border border-blue-700/40 text-blue-300',
  },
  {
    id: 'todos',
    label: 'Todos',
    idStatuses: [],
    badgeClass: 'bg-slate-700/60 border border-slate-600/40 text-slate-300',
  },
]

// Grupo padrão ao entrar na tela
const DEFAULT_GROUP = 'ativos'

const TIPO_OPTIONS = [
  { value: '', label: 'Todos os tipos' },
  { value: 'Web', label: 'Web' },
  { value: 'Desktop', label: 'Desktop' },
]

export default function ContractsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const isSupport = user?.role === 'SUPPORT'
  const [search, setSearch] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>(DEFAULT_GROUP)
  const [tipoContrato, setTipoContrato] = useState('')
  const [page, setPage] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  const group = STATUS_GROUPS.find(g => g.id === selectedGroup)!

  // Montar params de status para a API
  const buildStatusParams = () => {
    if (selectedGroup === 'todos') return {}
    if (selectedGroup === 'ativos') return { idStatuses: '1,3,5' }
    if (selectedGroup === 'encerramento') return { idStatuses: '2', onlyEncerramento: 'true' }
    if (group.idStatuses.length === 1) return { idStatuses: String(group.idStatuses[0]) }
    return { idStatuses: group.idStatuses.join(',') }
  }

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['contracts', search, selectedGroup, tipoContrato, page],
    queryFn: () =>
      api
        .get('/contracts', {
          params: {
            search: search || undefined,
            tipoContrato: tipoContrato || undefined,
            page,
            limit: 50,
            ...buildStatusParams(),
          },
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  })

  const contracts = data?.data || []
  const meta = data?.meta || {}

  const handleGroupClick = (groupId: string) => {
    setSelectedGroup(groupId)
    setPage(1)
  }

  const handleClearFilters = () => {
    setSearch('')
    setSelectedGroup(DEFAULT_GROUP)
    setTipoContrato('')
    setPage(1)
  }

  const hasActiveFilters =
    selectedGroup !== DEFAULT_GROUP || !!tipoContrato || !!search

  return (
    <div>
      {/* Header */}
      <div className="page-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title">Contratos</h1>
          <p className="page-subtitle">
            {meta.total != null
              ? `${meta.total} contrato(s) — ${group.label}`
              : 'Gestão de contratos'}
          </p>
        </div>
        <button className="btn-secondary w-fit" onClick={() => refetch()}>
          <RefreshCw size={15} />
          Atualizar
        </button>
      </div>

      {/* Chips de status — filtro principal */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_GROUPS.map((g) => (
          <button
            key={g.id}
            onClick={() => handleGroupClick(g.id)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
              selectedGroup === g.id
                ? g.badgeClass + ' ring-2 ring-offset-2 ring-offset-slate-950 ring-current'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200',
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Barra de busca + filtros avançados */}
      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              className="input pl-9"
              placeholder="Buscar por cliente ou CNPJ..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>

          <button
            className={clsx('btn-ghost', showFilters && 'bg-slate-700 text-slate-100')}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={15} />
            Filtros
            <ChevronDown
              size={14}
              className={clsx('transition-transform', showFilters && 'rotate-180')}
            />
          </button>

          {hasActiveFilters && (
            <button className="btn-ghost text-xs text-slate-500" onClick={handleClearFilters}>
              Limpar filtros
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="form-group">
              <label className="label">Tipo de Contrato</label>
              <select
                className="select"
                value={tipoContrato}
                onChange={(e) => { setTipoContrato(e.target.value); setPage(1) }}
              >
                {TIPO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      {isLoading ? (
        <Loading text="Carregando contratos..." />
      ) : error ? (
        <ErrorMsg message="Erro ao carregar contratos" />
      ) : contracts.length === 0 ? (
        <Empty
          title="Nenhum contrato encontrado"
          description={
            selectedGroup === 'ativos'
              ? 'Nenhum contrato ativo encontrado. Sincronize os contratos em Configurações.'
              : 'Tente ajustar os filtros de status.'
          }
        />
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>CNPJ/CPF</th>
                  <th>Cliente</th>
                  <th>Status</th>
                  <th>Tipo</th>
                  <th>Versão</th>
                  {!isSupport && <th>Custo Lic.</th>}
                  {!isSupport && <th>Venda</th>}
                  <th>Usuários</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c: any) => {
                  const valorVenda = c.financial?.valorVenda
                    ? Number(c.financial.valorVenda)
                    : 0
                  const valorCusto = Number(c.valortotal)

                  // schema: migrations    → "NewContract" → este é o newContractId → NOVO (ativo, substituto)
                  //         oldMigrations → "OldContract" → este é o oldContractId → ANTIGO (encerrado)
                  const isNovo   = c.migrations?.length > 0     // este ativo substituiu um antigo
                  const isAntigo = c.oldMigrations?.length > 0  // este encerrado foi substituído

                  return (
                    <tr
                      key={c.id}
                      className={clsx(
                        isAntigo && 'opacity-50', // ← esmaecer o ANTIGO (encerrado substituído)
                      )}
                    >
                      <td className="font-mono text-xs text-slate-400">{c.cpfCnpj}</td>

                      <td className="max-w-[220px]">
                        <div className="flex items-start gap-1.5">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-200">
                              {c.clienteFinal}
                            </p>

                            {/* Alertas */}
                            {c.diasParaBloqueio > 0 && (
                              <p className="text-xs text-yellow-400">
                                ⚠ {c.diasParaBloqueio}d p/ bloqueio
                              </p>
                            )}
                            {c.diasParaEncerrar > 0 && (
                              <p className="text-xs text-orange-400">
                                ⏳ {c.diasParaEncerrar}d p/ encerrar
                              </p>
                            )}

                            {/* Este é o NOVO — substituiu um encerrado */}
                            {isNovo && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <ArrowRightLeft size={10} className="text-blue-400 shrink-0" />
                                <span className="text-xs text-blue-400 truncate">
                                  Substituiu: {c.migrations[0]?.oldContract?.clienteFinal ?? '—'}
                                </span>
                              </div>
                            )}

                            {/* Este é o ANTIGO — foi substituído por um ativo */}
                            {isAntigo && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <ArrowRightLeft size={10} className="text-slate-500 shrink-0" />
                                <span className="text-xs text-slate-500 truncate">
                                  Substituído por: {c.oldMigrations[0]?.newContract?.clienteFinal ?? '—'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <div className="flex flex-col gap-1">
                          <StatusBadge idStatus={c.idStatus} />
                          {isNovo && (
                            <span className="badge badge-blue text-xs">Migração</span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={clsx(
                            'badge',
                            c.tipoContrato?.toLowerCase() === 'web'
                              ? 'badge-blue'
                              : 'badge-gray',
                          )}
                        >
                          {c.tipoContrato || '-'}
                        </span>
                      </td>

                      <td className="text-xs text-slate-400">
                        {c.versaoSistema || '-'}
                      </td>

                      {!isSupport && (
                        <td>
                          <Currency value={valorCusto} />
                        </td>
                      )}

                      {!isSupport && (
                        <td>
                          {valorVenda > 0 ? (
                            <Currency value={valorVenda} colored />
                          ) : (
                            <span className="text-slate-500 text-xs italic">
                              Não informado
                            </span>
                          )}
                        </td>
                      )}

                      <td className="text-center text-slate-300">{c.usuarios}</td>

                      <td>
                        <div className="flex items-center gap-1">
                          {/* Botão Ver — usa link nativo para garantir navegação */}
                          <a
                            href={`/contratos/${c.id}`}
                            className="btn-ghost text-xs"
                            onClick={(e) => { e.preventDefault(); navigate(`/contratos/${c.id}`) }}
                          >
                            <Eye size={14} />
                            Ver
                          </a>

                          {/* Atalho Uniplus — só para contratos Web */}
                          {c.tipoContrato?.toLowerCase() === 'web' && c.webAccessUrl && (
                            <a
                              href={c.webAccessUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-ghost text-xs p-1.5 text-blue-400 hover:text-blue-300"
                              title={`Acessar Uniplus — ${c.clienteFinal}`}
                            >
                              <Globe size={14} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 pb-4 border-t border-slate-800 pt-3 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Exibindo {contracts.length} de {meta.total || 0} contratos
            </p>
            <Pagination
              page={page}
              totalPages={meta.totalPages || 1}
              onPage={setPage}
            />
          </div>
        </div>
      )}
    </div>
  )
}
