import { useQuery } from '@tanstack/react-query'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { useState } from 'react'
import {
  DollarSign, TrendingUp, Users, Server,
  Target, AlertTriangle, RefreshCw, Activity,
} from 'lucide-react'
import api from '../../services/api'
import { Loading, ErrorMsg, ProgressBar, Currency, Percentage } from '../../components/ui'
import clsx from 'clsx'

const PIE_COLORS = ['#22c55e', '#6b7280', '#ef4444', '#3b82f6', '#eab308', '#8b5cf6']

// ─── Quadro agrupador de seção ────────────────────────────────────────────────
function SectionGroup({
  icon,
  label,
  color = 'slate',
  children,
}: {
  icon: string
  label: string
  color?: 'green' | 'yellow' | 'blue' | 'purple' | 'slate'
  children: React.ReactNode
}) {
  const borderMap = {
    green:  'border-green-700/40',
    yellow: 'border-yellow-700/40',
    blue:   'border-blue-700/40',
    purple: 'border-purple-700/40',
    slate:  'border-slate-700/40',
  }
  const headerMap = {
    green:  'text-green-400',
    yellow: 'text-yellow-400',
    blue:   'text-blue-400',
    purple: 'text-purple-400',
    slate:  'text-slate-400',
  }
  return (
    <div className={clsx(
      'rounded-xl border bg-slate-900/40 p-4',
      borderMap[color],
    )}>
      <p className={clsx(
        'text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5',
        headerMap[color],
      )}>
        <span>{icon}</span>
        {label}
      </p>
      {children}
    </div>
  )
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color = 'blue',
}: {
  label: string
  value: string
  sub?: string
  icon: any
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple'
}) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-900/30',
    green: 'text-green-400 bg-green-900/30',
    red: 'text-red-400 bg-red-900/30',
    yellow: 'text-yellow-400 bg-yellow-900/30',
    purple: 'text-purple-400 bg-purple-900/30',
  }
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {sub && <p className="stat-sub mt-1">{sub}</p>}
        </div>
        <div className={clsx('p-2 rounded-lg', colorMap[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

function GoalCard({
  label,
  current,
  desired,
  formatter,
}: {
  label: string
  current: number
  desired: number
  formatter: (v: number) => string
}) {
  const pct = desired > 0 ? Math.min((current / desired) * 100, 100) : 0
  const color = pct >= 100 ? 'green' : pct >= 70 ? 'blue' : pct >= 40 ? 'yellow' : 'red'
  return (
    <div className="stat-card">
      <p className="stat-label mb-2">{label}</p>
      <div className="flex items-end justify-between mb-2">
        <span className="text-xl font-bold text-slate-100">{formatter(current)}</span>
        <span className="text-sm text-slate-500">Meta: {formatter(desired)}</span>
      </div>
      <ProgressBar value={current} max={desired} color={color} />
      <p className="text-xs text-slate-500 mt-1">{pct.toFixed(0)}% da meta</p>
    </div>
  )
}

const fmtBrl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const tooltipStyle = {
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '12px',
}

export default function DashboardPage() {
  const [chartYear, setChartYear] = useState(new Date().getFullYear())
  const [chartYearNovos, setChartYearNovos] = useState(new Date().getFullYear())
  const [tipoNovos, setTipoNovos] = useState<'bar' | 'line'>('bar')
  const [tipoAtivos, setTipoAtivos] = useState<'area' | 'line'>('area')

  // Anos disponíveis para o seletor
  const currentYear = new Date().getFullYear()
  const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - 4 + i)

  const { data: summary, isLoading: loadingSum, error: errSum } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: charts, isLoading: loadingCharts } = useQuery({
    queryKey: ['dashboard-charts', chartYear, chartYearNovos],
    queryFn: () => api.get(`/dashboard/charts?year=${chartYear}&yearNovos=${chartYearNovos}`).then(r => r.data),
  })

  if (loadingSum) return <Loading text="Carregando dashboard..." />
  if (errSum) return <ErrorMsg message="Erro ao carregar dashboard" />

  const { vendas, intelidata, servidores, metas } = summary

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Visão geral da revenda em tempo real</p>
      </div>

      {/* Cards Vendas */}
      <SectionGroup icon="💰" label="Receitas" color="green">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total de Venda"
            value={fmtBrl(vendas.totalVenda)}
            sub={`${vendas.totalContratosAtivos} contratos ativos`}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            label="Valor Líquido"
            value={fmtBrl(vendas.valorLiquido)}
            sub={`Margem: ${vendas.margemPercentual.toFixed(1)}%`}
            icon={TrendingUp}
            color={vendas.valorLiquido >= 0 ? 'green' : 'red'}
          />
          <StatCard
            label="Ticket Médio"
            value={fmtBrl(vendas.ticketMedioVenda)}
            icon={Activity}
            color="blue"
          />
          <StatCard
            label="Contratos Ativos"
            value={String(vendas.totalContratosAtivos)}
            sub={`${intelidata.contratosBloqueados} bloqueados`}
            icon={Users}
            color="blue"
          />
        </div>
      </SectionGroup>

      {/* Cards Intelidata */}
      <SectionGroup icon="🔗" label="Intelidata" color="yellow">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Custo Licenças"
            value={fmtBrl(intelidata.totalCustoLicencas)}
            icon={DollarSign}
            color="yellow"
          />
          <StatCard
            label="Ticket Médio Custo"
            value={fmtBrl(intelidata.ticketMedioCusto)}
            icon={Activity}
            color="yellow"
          />
          <StatCard
            label="Contratos Bloqueados"
            value={String(intelidata.contratosBloqueados)}
            sub={`${intelidata.contratosEncerrados} encerrados`}
            icon={AlertTriangle}
            color="red"
          />
          <StatCard
            label="Degustação"
            value={String(intelidata.contratosDegustacao)}
            sub={`${intelidata.contratosMigrados} migrados`}
            icon={RefreshCw}
            color="purple"
          />
        </div>
      </SectionGroup>

      {/* Cards Servidores */}
      <SectionGroup icon="🖥️" label="Servidores" color="blue">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Servidores Ativos"
            value={String(servidores.totalServidores)}
            icon={Server}
            color="blue"
          />
          <StatCard
            label="Custo Mensal"
            value={fmtBrl(servidores.totalCusto)}
            icon={DollarSign}
            color="red"
          />
          <StatCard
            label="Receita Servidores"
            value={fmtBrl(servidores.totalReceita)}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            label="Margem Servidores"
            value={`${servidores.margemPercentual.toFixed(1)}%`}
            icon={TrendingUp}
            color={servidores.margemPercentual >= 0 ? 'green' : 'red'}
          />
        </div>
      </SectionGroup>

      {/* Metas */}
      {metas && (
        <SectionGroup
          icon="🎯"
          label={`Metas — ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`}
          color="purple"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <GoalCard
              label="Contratos Ativos"
              current={metas.contratosAtivos}
              desired={metas.desiredActiveContracts}
              formatter={(v) => String(v)}
            />
            <GoalCard
              label="Custo Intelidata"
              current={metas.custoIntelidataAtual}
              desired={Number(metas.desiredIntelidataCostValue)}
              formatter={fmtBrl}
            />
            <GoalCard
              label="Valor de Venda"
              current={metas.vendaAtual}
              desired={Number(metas.desiredSalesValue)}
              formatter={fmtBrl}
            />
          </div>
        </SectionGroup>
      )}

      {/* Gráficos */}
      {loadingCharts ? (
        <Loading text="Carregando gráficos..." />
      ) : charts ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pizza - Contratos por Status */}
          <div className="card">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Contratos por Status</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={charts.contratosPorStatus}
                  dataKey="total"
                  nameKey="descricao"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ descricao, total }) => `${descricao}: ${total}`}
                  labelLine={false}
                >
                  {charts.contratosPorStatus.map((_: any, i: number) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Barras/Linhas - Novos vs Cancelados por ano */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-300">Novos vs Cancelamentos Reais</h3>
                <p className="text-xs text-slate-500 mt-0.5">Migrados não contam como cancelamento</p>
              </div>
              <div className="flex items-center gap-2">
                {/* Toggle tipo */}
                <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
                  <button
                    className={clsx('px-2 py-1 transition-colors', tipoNovos === 'bar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200')}
                    onClick={() => setTipoNovos('bar')}
                    title="Barras"
                  >
                    ▋▋
                  </button>
                  <button
                    className={clsx('px-2 py-1 transition-colors', tipoNovos === 'line' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200')}
                    onClick={() => setTipoNovos('line')}
                    title="Linhas"
                  >
                    ∿
                  </button>
                </div>
                {/* Seletor de ano */}
                <select
                  className="select w-auto text-xs"
                  value={chartYearNovos}
                  onChange={(e) => setChartYearNovos(Number(e.target.value))}
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={220}>
              {tipoNovos === 'bar' ? (
                <BarChart data={charts.novosPorMes} barGap={2} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [v, n]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="novos" name="Novos" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="cancelados" name="Cancelados" fill="#ef4444" radius={[3, 3, 0, 0]} />
                </BarChart>
              ) : (
                <LineChart data={charts.novosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="novos" name="Novos" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} />
                  <Line type="monotone" dataKey="cancelados" name="Cancelados" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
                </LineChart>
              )}
            </ResponsiveContainer>

            {/* Resumo anual */}
            {charts.novosPorMes && (() => {
              const totalNovos = charts.novosPorMes.reduce((a: number, m: any) => a + m.novos, 0)
              const totalCancelados = charts.novosPorMes.reduce((a: number, m: any) => a + m.cancelados, 0)
              const saldo = totalNovos - totalCancelados
              return (
                <div className="flex gap-4 mt-3 pt-3 border-t border-slate-800 text-xs">
                  <span className="text-green-400">▲ {totalNovos} novos</span>
                  <span className="text-red-400">▼ {totalCancelados} cancelados</span>
                  <span className={clsx('ml-auto font-medium', saldo >= 0 ? 'text-green-400' : 'text-red-400')}>
                    Saldo: {saldo >= 0 ? '+' : ''}{saldo}
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Area/Linha - Evolução ativos */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-300">Contratos Ativos por Mês</h3>
              <div className="flex items-center gap-2">
                {/* Toggle tipo */}
                <div className="flex rounded-lg border border-slate-700 overflow-hidden text-xs">
                  <button
                    className={clsx('px-2 py-1 transition-colors', tipoAtivos === 'area' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200')}
                    onClick={() => setTipoAtivos('area')}
                    title="Área"
                  >
                    ▋▋
                  </button>
                  <button
                    className={clsx('px-2 py-1 transition-colors', tipoAtivos === 'line' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200')}
                    onClick={() => setTipoAtivos('line')}
                    title="Linhas"
                  >
                    ∿
                  </button>
                </div>
                {/* Seletor de ano */}
                <select
                  className="select w-auto text-xs"
                  value={chartYear}
                  onChange={(e) => setChartYear(Number(e.target.value))}
                >
                  {availableYears.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              {tipoAtivos === 'area' ? (
                <AreaChart data={charts.ativosPorMes}>
                  <defs>
                    <linearGradient id="colorAtivos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="ativos" name="Contratos Ativos" stroke="#3b82f6" strokeWidth={2} fill="url(#colorAtivos)" />
                </AreaChart>
              ) : (
                <LineChart data={charts.ativosPorMes}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="ativos" name="Contratos Ativos" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  )
}
