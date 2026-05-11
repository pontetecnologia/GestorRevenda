// src/components/ui/index.tsx - Componentes reutilizáveis

import clsx from 'clsx'
import { Loader2, AlertCircle, PackageSearch, X } from 'lucide-react'
import { ReactNode } from 'react'

// ---- Loading ----
export function Loading({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeMap = { sm: 16, md: 24, lg: 40 }
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-400">
      <Loader2 size={sizeMap[size]} className="animate-spin text-blue-500" />
      {text && <p className="text-sm">{text}</p>}
    </div>
  )
}

// ---- Empty State ----
export function Empty({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
      <PackageSearch size={40} />
      <div className="text-center">
        <p className="font-medium text-slate-400">{title}</p>
        {description && <p className="text-sm mt-1">{description}</p>}
      </div>
    </div>
  )
}

// ---- Error ----
export function ErrorMsg({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-red-400 bg-red-900/20 border border-red-700/30 rounded-lg p-3 text-sm">
      <AlertCircle size={16} className="flex-shrink-0" />
      {message}
    </div>
  )
}

// ---- Modal ----
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  if (!open) return null
  const sizeMap = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={clsx('relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full animate-fade-in', sizeMap[size])}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="font-semibold text-slate-100">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-100">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

// ---- Contract Status Badge ----
const statusConfig: Record<number, { label: string; cls: string }> = {
  1: { label: 'Aberto', cls: 'badge-green' },
  2: { label: 'Encerrado', cls: 'badge-gray' },
  3: { label: 'Bloqueado', cls: 'badge-red' },
  4: { label: 'Migrado', cls: 'badge-blue' },
  5: { label: 'Degustação', cls: 'badge-yellow' },
  6: { label: 'Degustação enc.', cls: 'badge-gray' },
}

export function StatusBadge({ idStatus }: { idStatus: number }) {
  const cfg = statusConfig[idStatus] || { label: String(idStatus), cls: 'badge-gray' }
  return <span className={clsx('badge', cfg.cls)}>{cfg.label}</span>
}

// ---- Currency ----
export function Currency({ value, colored }: { value: number; colored?: boolean }) {
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
  return (
    <span
      className={
        colored
          ? value > 0
            ? 'text-green-400'
            : value < 0
            ? 'text-red-400'
            : 'text-slate-400'
          : ''
      }
    >
      {formatted}
    </span>
  )
}

// ---- Percentage ----
export function Percentage({ value, colored }: { value: number; colored?: boolean }) {
  return (
    <span
      className={
        colored
          ? value > 0
            ? 'text-green-400'
            : value < 0
            ? 'text-red-400'
            : 'text-slate-400'
          : ''
      }
    >
      {value.toFixed(1)}%
    </span>
  )
}

// ---- Progress Bar ----
export function ProgressBar({
  value,
  max,
  color = 'blue',
}: {
  value: number
  max: number
  color?: 'blue' | 'green' | 'yellow' | 'red'
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const colorMap = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  }
  return (
    <div className="progress-bar">
      <div
        className={clsx('progress-fill', colorMap[color])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

// ---- Confirm Dialog ----
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  danger = false,
}: {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: string
  confirmLabel?: string
  danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {description && <p className="text-sm text-slate-400 mb-5">{description}</p>}
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button
          className={danger ? 'btn-danger' : 'btn-primary'}
          onClick={() => { onConfirm(); onClose() }}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// ---- Pagination ----
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center gap-2 justify-end mt-4">
      <button
        className="btn-ghost text-xs"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Anterior
      </button>
      <span className="text-sm text-slate-400">
        {page} / {totalPages}
      </span>
      <button
        className="btn-ghost text-xs"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Próximo
      </button>
    </div>
  )
}
