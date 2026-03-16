import { X } from 'lucide-react'
import type { ColumnFilter, FilterOperator } from '@/modules/workspace/hooks/controllers/workspace-utils'

type CustomFilterModalProps = {
  column: string
  draftFilter: ColumnFilter
  onClose: () => void
  onChangeMode: (mode: 'AND' | 'OR') => void
  onChangeOperator: (index: 0 | 1, operator: FilterOperator) => void
  onChangeValue: (index: 0 | 1, value: string) => void
  onReset: () => void
  onApply: () => void
}

const operatorOptions: Array<{ value: FilterOperator; label: string }> = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'endsWith', label: 'Ends with' },
  { value: 'isEmpty', label: 'Is empty' },
  { value: 'isNotEmpty', label: 'Is not empty' },
]

export function CustomFilterModal({
  column,
  draftFilter,
  onClose,
  onChangeMode,
  onChangeOperator,
  onChangeValue,
  onReset,
  onApply,
}: CustomFilterModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded border border-slate-300 bg-white p-3 shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-700">Custom Filter</p>
            <p className="text-xs text-slate-500">{column}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="mb-2 text-xs text-slate-600">Show rows where:</p>
        <div className="space-y-2">
          {[0, 1].map((index) => {
            const clause = draftFilter.clauses[index] ?? { operator: 'contains' as const, value: '' }
            const noInput = clause.operator === 'isEmpty' || clause.operator === 'isNotEmpty'
            return (
              <div key={index} className="flex items-center gap-2">
                <select
                  value={clause.operator}
                  onChange={(event) => onChangeOperator(index as 0 | 1, event.target.value as FilterOperator)}
                  className="w-36 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
                >
                  {operatorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <input
                  value={clause.value}
                  onChange={(event) => onChangeValue(index as 0 | 1, event.target.value)}
                  disabled={noInput}
                  className="w-full rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 disabled:bg-slate-100"
                />
              </div>
            )
          })}
        </div>

        <div className="mt-3 flex items-center gap-4 text-xs text-slate-700">
          <label className="inline-flex items-center gap-1">
            <input type="radio" checked={draftFilter.mode === 'AND'} onChange={() => onChangeMode('AND')} />
            AND
          </label>
          <label className="inline-flex items-center gap-1">
            <input type="radio" checked={draftFilter.mode === 'OR'} onChange={() => onChangeMode('OR')} />
            OR
          </label>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onReset} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
            Reset
          </button>
          <button type="button" onClick={onClose} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={onApply} className="rounded bg-indigo-600 px-3 py-1 text-xs text-white hover:bg-indigo-700">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
