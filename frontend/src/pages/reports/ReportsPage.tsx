import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { BarChart3, TrendingUp, Users, AlertCircle } from 'lucide-react'
import api from '../../services/api'
import { Loading, ErrorMsg, Empty, Currency } from '../../components/ui'
import clsx from 'clsx'

type ReportTab = 'saas' | 'abc' | 'profitability' | 'cancellations' | 'general' | 'receitas'

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'saas', label: 'Indicadores SaaS' },
  { id: 'receitas', label: 'Receitas & Custos' },
  { id: 'abc', label: 'Curva ABC' },
  { id: 'profitability', label: 'Lucratividade' },
  { id: 'cancellations', label: 'Cancelamentos' },
  { id: 'general', label: 'Análise Geral' },
]

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '12px',
}

const fmtBrl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className={clsx('stat-value mt-1', color)}>{value}</p>
      {sub && <p className="stat-sub mt-0.5">{sub}</p>}
    </div>
  )
}

// ---- Receitas & Custos por Tipo ----
function ReceitasCustosReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report-receitas-custos'],
    queryFn: () => api.get('/reports/receitas-custos').then(r => r.data),
  })

  if (isLoading) return <Loading />
  if (error || !data) return <ErrorMsg message="Erro ao carregar relatório" />

  const { linhas, totais, totalContratos } = data

  const colClass = 'px-3 py-2.5 text-right text-sm'
  const colHead  = 'px-3 py-2 text-right text-xs font-medium text-slate-400 uppercase tracking-wide whitespace-nowrap'

  return (
    <div className="space-y-4">
      {/* Cards de totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card border-green-700/30">
          <p className="stat-label">Total Receita</p>
          <p className="stat-value text-green-400">{fmtBrl(totais.totalReceita)}</p>
          <p className="stat-sub">{totalContratos} contratos ativos</p>
        </div>
        <div className="stat-card border-red-700/30">
          <p className="stat-label">Total Custo</p>
          <p className="stat-value text-red-400">{fmtBrl(totais.totalCusto)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Resultado Líquido</p>
          <p className={clsx('stat-value', totais.liquido >= 0 ? 'text-green-400' : 'text-red-400')}>
            {fmtBrl(totais.liquido)}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Margem Geral</p>
          <p className={clsx('stat-value', totais.margem >= 0 ? 'text-green-400' : 'text-red-400')}>
            {totais.margem.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Totais por categoria */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Licenças (Venda)', value: totais.valorVenda, color: 'text-blue-400' },
          { label: 'TEF', value: totais.valorTef, color: 'text-purple-400' },
          { label: 'Servidor', value: totais.valorServidor, color: 'text-cyan-400' },
          { label: 'Outras Receitas', value: totais.outrasReceitas, color: 'text-yellow-400' },
        ].map((item, i) => (
          <div key={i} className="card py-3">
            <p className="stat-label">{item.label}</p>
            <p className={clsx('text-lg font-bold mt-1', item.color)}>{fmtBrl(item.value)}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Custo Intelidata', value: totais.custoIntelidata, color: 'text-orange-400' },
          { label: 'Custo TEF', value: totais.custoTef, color: 'text-orange-300' },
          { label: 'Custo Servidor', value: totais.custoServidor, color: 'text-orange-200' },
          { label: 'Outros Custos', value: totais.outrosCustos, color: 'text-slate-400' },
        ].map((item, i) => (
          <div key={i} className="card py-3">
            <p className="stat-label">{item.label}</p>
            <p className={clsx('text-lg font-bold mt-1', item.color)}>{fmtBrl(item.value)}</p>
          </div>
        ))}
      </div>

      {/* Tabela detalhada */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-slate-300">Detalhamento por Contrato</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700">
                <th className="px-4 py-2 text-left text-xs font-medium text-slate-400 uppercase">Cliente</th>
                {/* Receitas */}
                <th className={colHead}>Licenças</th>
                <th className={colHead}>TEF</th>
                <th className={colHead}>Servidor</th>
                <th className={colHead}>Outras Rec.</th>
                <th className={clsx(colHead, 'text-green-400')}>Total Rec.</th>
                {/* Custos */}
                <th className={colHead}>Custo Intelidata</th>
                <th className={colHead}>Custo TEF</th>
                <th className={colHead}>Custo Serv.</th>
                <th className={colHead}>Outros Cust.</th>
                <th className={clsx(colHead, 'text-red-400')}>Total Cust.</th>
                {/* Resultado */}
                <th className={colHead}>Líquido</th>
                <th className={colHead}>Margem</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l: any) => (
                <tr key={l.id} className="border-b border-slate-800 hover:bg-slate-800/40">
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-200 truncate max-w-[160px]">{l.cliente}</p>
                    <p className="text-xs text-slate-500 font-mono">{l.cpfCnpj}</p>
                  </td>
                  <td className={colClass}>{fmtBrl(l.valorVenda)}</td>
                  <td className={colClass}>{fmtBrl(l.valorTef)}</td>
                  <td className={colClass}>{fmtBrl(l.valorServidor)}</td>
                  <td className={colClass}>{fmtBrl(l.outrasReceitas)}</td>
                  <td className={clsx(colClass, 'font-semibold text-green-400')}>{fmtBrl(l.totalReceita)}</td>
                  <td className={colClass}>{fmtBrl(l.custoIntelidata)}</td>
                  <td className={colClass}>{fmtBrl(l.custoTef)}</td>
                  <td className={colClass}>{fmtBrl(l.custoServidor)}</td>
                  <td className={colClass}>{fmtBrl(l.outrosCustos)}</td>
                  <td className={clsx(colClass, 'font-semibold text-red-400')}>{fmtBrl(l.totalCusto)}</td>
                  <td className={clsx(colClass, 'font-semibold', l.liquido >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {fmtBrl(l.liquido)}
                  </td>
                  <td className={clsx(colClass, l.margem >= 0 ? 'text-green-400' : 'text-red-400')}>
                    {l.margem.toFixed(1)}%
                  </td>
                </tr>
              ))}
              {/* Linha de totais */}
              <tr className="border-t-2 border-slate-600 bg-slate-800/60 font-bold">
                <td className="px-4 py-3 text-slate-200 text-sm">TOTAL ({totalContratos} contratos)</td>
                <td className={colClass}>{fmtBrl(totais.valorVenda)}</td>
                <td className={colClass}>{fmtBrl(totais.valorTef)}</td>
                <td className={colClass}>{fmtBrl(totais.valorServidor)}</td>
                <td className={colClass}>{fmtBrl(totais.outrasReceitas)}</td>
                <td className={clsx(colClass, 'text-green-400')}>{fmtBrl(totais.totalReceita)}</td>
                <td className={colClass}>{fmtBrl(totais.custoIntelidata)}</td>
                <td className={colClass}>{fmtBrl(totais.custoTef)}</td>
                <td className={colClass}>{fmtBrl(totais.custoServidor)}</td>
                <td className={colClass}>{fmtBrl(totais.outrosCustos)}</td>
                <td className={clsx(colClass, 'text-red-400')}>{fmtBrl(totais.totalCusto)}</td>
                <td className={clsx(colClass, totais.liquido >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {fmtBrl(totais.liquido)}
                </td>
                <td className={clsx(colClass, totais.margem >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {totais.margem.toFixed(1)}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---- SaaS Indicators ----
function SaasReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report-saas'],
    queryFn: () => api.get('/reports/saas').then(r => r.data),
  })

  if (isLoading) return <Loading />
  if (error || !data) return <ErrorMsg message="Erro ao carregar relatório" />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="MRR" value={fmtBrl(data.mrr)} sub="Receita Mensal Recorrente" color="text-green-400" />
        <KPI label="ARR" value={fmtBrl(data.arr)} sub="Receita Anual Projetada" />
        <KPI label="Contratos Ativos" value={String(data.contratosAtivos)} />
        <KPI label="Ticket Médio" value={fmtBrl(data.ticketMedio)} />
        <KPI label="Novos (30d)" value={String(data.novosUltimos30)} color="text-green-400" />
        <KPI label="Cancelamentos Reais" value={String(data.canceladosReais)} color="text-red-400" />
        <KPI label="Churn Rate" value={`${data.churnRate.toFixed(1)}%`} color={data.churnRate > 5 ? 'text-red-400' : 'text-green-400'} />
      </div>

      {data.mrrEvolucao?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Evolução do MRR (12 meses)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.mrrEvolucao}>
              <defs>
                <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => fmtBrl(v)} />
              <Area type="monotone" dataKey="mrr" name="MRR" stroke="#22c55e" strokeWidth={2} fill="url(#mrrGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ---- ABC Curve ----
function AbcReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report-abc'],
    queryFn: () => api.get('/reports/abc').then(r => r.data),
  })

  if (isLoading) return <Loading />
  if (error || !data) return <ErrorMsg message="Erro ao carregar relatório" />

  const classBadge: Record<string, string> = {
    A: 'bg-green-900/40 text-green-400 border border-green-700/30',
    B: 'bg-blue-900/40 text-blue-400 border border-blue-700/30',
    C: 'bg-slate-700/40 text-slate-400 border border-slate-600/30',
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="stat-card border-green-700/30">
          <p className="stat-label">Classe A</p>
          <p className="stat-value text-green-400">{data.resumo.classeA}</p>
          <p className="stat-sub">Até 80% da receita</p>
        </div>
        <div className="stat-card border-blue-700/30">
          <p className="stat-label">Classe B</p>
          <p className="stat-value text-blue-400">{data.resumo.classeB}</p>
          <p className="stat-sub">80% a 95%</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Classe C</p>
          <p className="stat-value">{data.resumo.classeC}</p>
          <p className="stat-sub">Acima de 95%</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>CNPJ</th>
                <th>Receita</th>
                <th>Participação</th>
                <th>Acumulado</th>
                <th>Classe</th>
              </tr>
            </thead>
            <tbody>
              {data.clientes.map((c: any, i: number) => (
                <tr key={c.id}>
                  <td className="text-slate-500">{i + 1}</td>
                  <td className="font-medium text-slate-200 max-w-[200px] truncate">{c.cliente}</td>
                  <td className="font-mono text-xs text-slate-400">{c.cpfCnpj}</td>
                  <td><Currency value={c.receita} /></td>
                  <td>{c.participacao.toFixed(2)}%</td>
                  <td>{c.participacaoAcumulada.toFixed(2)}%</td>
                  <td>
                    <span className={clsx('badge', classBadge[c.classe])}>
                      {c.classe}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---- Profitability ----
function ProfitabilityReport() {
  const [orderBy, setOrderBy] = useState('margem')
  const { data, isLoading, error } = useQuery({
    queryKey: ['report-profit', orderBy],
    queryFn: () => api.get(`/reports/profitability?orderBy=${orderBy}`).then(r => r.data),
  })

  if (isLoading) return <Loading />
  if (error || !data) return <ErrorMsg message="Erro ao carregar relatório" />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Receita Total" value={fmtBrl(data.resumo.totalReceita)} color="text-green-400" />
        <KPI label="Custo Total" value={fmtBrl(data.resumo.totalCusto)} color="text-red-400" />
        <KPI label="Margem Líquida" value={fmtBrl(data.resumo.totalMargem)} color={data.resumo.totalMargem >= 0 ? 'text-green-400' : 'text-red-400'} />
        <KPI label="Margem %" value={`${data.resumo.totalMargemPct.toFixed(1)}%`} />
      </div>

      {/* Top 5 */}
      <div className="card">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">🏆 Top 5 Mais Lucrativos</h3>
        <div className="space-y-3">
          {data.top5.map((c: any, i: number) => (
            <div key={c.id} className="flex items-center gap-3">
              <span className="text-2xl font-bold text-slate-600 w-8">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-200 truncate">{c.cliente}</p>
                <p className="text-xs text-slate-500">{c.cpfCnpj}</p>
              </div>
              <div className="text-right">
                <p className={clsx('font-bold', c.margem >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {fmtBrl(c.margem)}
                </p>
                <p className="text-xs text-slate-500">{c.margemPct.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ranking completo */}
      <div className="card p-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-semibold text-slate-300">Ranking Completo</h3>
          <select className="select w-auto text-xs" value={orderBy} onChange={e => setOrderBy(e.target.value)}>
            <option value="margem">Maior Margem R$</option>
            <option value="margem_pct">Maior Margem %</option>
            <option value="receita">Maior Receita</option>
            <option value="custo">Maior Custo</option>
          </select>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>#</th>
                <th>Cliente</th>
                <th>CNPJ</th>
                <th>Venda</th>
                <th>Custo</th>
                <th>Margem R$</th>
                <th>Margem %</th>
              </tr>
            </thead>
            <tbody>
              {data.ranking.map((c: any) => (
                <tr key={c.id}>
                  <td className="text-slate-500">{c.posicao}</td>
                  <td className="font-medium max-w-[160px] truncate">{c.cliente}</td>
                  <td className="font-mono text-xs text-slate-400">{c.cpfCnpj}</td>
                  <td><Currency value={c.receita} /></td>
                  <td><Currency value={c.custo} /></td>
                  <td><Currency value={c.margem} colored /></td>
                  <td className={c.margemPct >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {c.margemPct.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ---- Cancellations ----
function CancellationsReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report-cancellations'],
    queryFn: () => api.get('/reports/cancellations').then(r => r.data),
  })

  if (isLoading) return <Loading />
  if (error || !data) return <ErrorMsg message="Erro ao carregar relatório" />

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Cancelados Reais" value={String(data.totalCancelados)} color="text-red-400" />
        <KPI label="Migrados" value={String(data.totalMigrados)} color="text-blue-400" />
        <KPI label="Receita Perdida" value={fmtBrl(data.receitaPerdida)} color="text-red-400" />
        <KPI label="Custo Eliminado" value={fmtBrl(data.custosEliminados)} color="text-green-400" />
      </div>

      {data.cancelados?.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <h3 className="text-sm font-semibold text-slate-300">Contratos Cancelados</h3>
          </div>
          <div className="table-container">
            <table className="table">
              <thead><tr><th>Cliente</th><th>CNPJ</th><th>Data Encerramento</th></tr></thead>
              <tbody>
                {data.cancelados.map((c: any) => (
                  <tr key={c.id}>
                    <td className="font-medium">{c.cliente}</td>
                    <td className="font-mono text-xs text-slate-400">{c.cpfCnpj}</td>
                    <td>{c.dataEncerramento ? new Date(c.dataEncerramento).toLocaleDateString('pt-BR') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ---- General ----
function GeneralReport() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['report-general'],
    queryFn: () => api.get('/reports/general').then(r => r.data),
  })

  if (isLoading) return <Loading />
  if (error || !data) return <ErrorMsg message="Erro ao carregar relatório" />

  const alertas = [
    { label: 'Sem Valor de Venda', count: data.alertas.semValorVenda, color: 'text-yellow-400', list: data.semValorVendaLista },
    { label: 'Margem Negativa', count: data.alertas.margemNegativa, color: 'text-red-400', list: data.margemNegativaLista },
    { label: 'Em Risco de Bloqueio', count: data.alertas.emRiscoBloqueio, color: 'text-orange-400', list: data.emRiscoBloqueioLista },
    { label: 'Bloqueados', count: data.alertas.contratosBloqueados, color: 'text-red-400', list: [] },
    { label: 'Sem Servidor (Web)', count: data.alertas.semServidor, color: 'text-yellow-400', list: [] },
  ]

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KPI label="Contratos Ativos" value={String(data.totalAtivos)} />
        <KPI label="Receita Total" value={fmtBrl(data.totalReceita)} color="text-green-400" />
        <KPI label="Ticket Médio" value={fmtBrl(data.ticketMedio)} />
      </div>

      <div>
        <p className="section-title flex items-center gap-2">
          <AlertCircle size={14} />
          Alertas e Pendências
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {alertas.map((a, i) => (
            <div key={i} className="stat-card">
              <p className="stat-label">{a.label}</p>
              <p className={clsx('stat-value mt-1', a.color)}>{a.count}</p>
            </div>
          ))}
        </div>
      </div>

      {data.emRiscoBloqueioLista?.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-slate-300 mb-3">⚠ Em Risco de Bloqueio (próximos 7 dias)</h3>
          <div className="space-y-2">
            {data.emRiscoBloqueioLista.map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-2 bg-orange-900/10 border border-orange-700/20 rounded-lg text-sm">
                <span className="text-slate-200">{c.cliente}</span>
                <span className="text-orange-400 font-medium">{c.diasParaBloqueio} dias</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Main ----
export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>('saas')

  const renderTab = () => {
    switch (tab) {
      case 'saas': return <SaasReport />
      case 'receitas': return <ReceitasCustosReport />
      case 'abc': return <AbcReport />
      case 'profitability': return <ProfitabilityReport />
      case 'cancellations': return <CancellationsReport />
      case 'general': return <GeneralReport />
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Relatórios & Análises</h1>
        <p className="page-subtitle">Inteligência de dados da sua revenda</p>
      </div>

      <div className="tabs-container overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab-active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {renderTab()}
      </div>
    </div>
  )
}
