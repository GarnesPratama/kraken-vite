import { Funnel, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { ColumnFilter, FilterOperator } from '@/modules/workspace/hooks/controllers/workspace-utils'
import type { ReactNode } from 'react'
import { CustomFilterModal } from './custom-filter-modal'

export type RecordItem = Record<string, unknown>

type ListViewProps = {
  records: RecordItem[]
  visibleColumns: string[]
  selectedRecordId?: string
  canEdit: boolean
  columnFilters: Record<string, ColumnFilter>
  onApplyColumnFilter: (column: string, filter: ColumnFilter | null) => void
  renderCell: (column: string, value: unknown) => ReactNode
  onEditRecord: (record: RecordItem) => void
  onSelectRecord: (record: RecordItem) => void
}

export function ListView({
  records,
  visibleColumns,
  selectedRecordId,
  canEdit,
  columnFilters,
  onApplyColumnFilter,
  renderCell,
  onEditRecord,
  onSelectRecord,
}: ListViewProps) {
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null)
  const [draftFilter, setDraftFilter] = useState<ColumnFilter | null>(null)

  function openFilter(column: string) {
    const current = columnFilters[column]
    setActiveFilterColumn(column)
    setDraftFilter(
      current ?? {
        mode: 'AND',
        clauses: [
          { operator: 'contains', value: '' },
          { operator: 'contains', value: '' },
        ],
      },
    )
  }

  function closeFilter() {
    setActiveFilterColumn(null)
    setDraftFilter(null)
  }

  function setClauseOperator(index: 0 | 1, operator: FilterOperator) {
    if (!draftFilter) return
    const nextClauses: [typeof draftFilter.clauses[0], typeof draftFilter.clauses[0]] = [
      { ...draftFilter.clauses[0] },
      { ...(draftFilter.clauses[1] ?? { operator: 'contains', value: '' }) },
    ]
    nextClauses[index] = { ...nextClauses[index], operator }
    if ((operator === 'isEmpty' || operator === 'isNotEmpty') && index >= 0) {
      nextClauses[index].value = ''
    }
    setDraftFilter({ ...draftFilter, clauses: nextClauses })
  }

  function setClauseValue(index: 0 | 1, value: string) {
    if (!draftFilter) return
    const nextClauses: [typeof draftFilter.clauses[0], typeof draftFilter.clauses[0]] = [
      { ...draftFilter.clauses[0] },
      { ...(draftFilter.clauses[1] ?? { operator: 'contains', value: '' }) },
    ]
    nextClauses[index] = { ...nextClauses[index], value }
    setDraftFilter({ ...draftFilter, clauses: nextClauses })
  }

  function applyFilter() {
    if (!activeFilterColumn || !draftFilter) return
    const [first, second] = draftFilter.clauses
    const firstActive = first.operator === 'isEmpty' || first.operator === 'isNotEmpty' || first.value.trim().length > 0
    const secondActive = second ? (second.operator === 'isEmpty' || second.operator === 'isNotEmpty' || second.value.trim().length > 0) : false
    if (!firstActive && !secondActive) {
      onApplyColumnFilter(activeFilterColumn, null)
    } else {
      onApplyColumnFilter(activeFilterColumn, {
        mode: draftFilter.mode,
        clauses: [first, second],
      })
    }
    closeFilter()
  }

  return (
    <>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-y border-indigo-100 bg-[#f8f9ff] text-[#4d5a88]">
            <th className="w-10 px-2 py-2 text-left font-semibold"> </th>
            {visibleColumns.map((column) => {
              const filterActive = Boolean(columnFilters[column])
              const isOpen = activeFilterColumn === column
              return (
                <th key={column} className="px-3 py-2 text-left font-semibold">
                  <div className="flex items-center justify-between gap-2">
                    <span>{column}</span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        if (isOpen) closeFilter()
                        else openFilter(column)
                      }}
                      className={`rounded p-1 ${filterActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                      title="Custom Filter"
                    >
                      <Funnel className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {records.map((record, index) => {
            const selected = String(record.id ?? '') === String(selectedRecordId ?? '')
            return (
              <tr
                key={String(record.id ?? index)}
                onClick={() => onSelectRecord(record)}
                className={`cursor-pointer border-b border-indigo-100 even:bg-[#fbfcff] hover:bg-indigo-50/60 ${selected ? 'bg-indigo-50' : ''}`}
              >
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      onEditRecord(record)
                    }}
                    disabled={!canEdit}
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Edit row"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </td>
                {visibleColumns.map((column) => (
                  <td key={`${String(record.id ?? index)}-${column}`} className="px-3 py-2 text-[#3f4c7c]">
                    {renderCell(column, record[column])}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
      {activeFilterColumn && draftFilter ? (
        <CustomFilterModal
          column={activeFilterColumn}
          draftFilter={draftFilter}
          onClose={closeFilter}
          onChangeMode={(mode) => setDraftFilter({ ...draftFilter, mode })}
          onChangeOperator={setClauseOperator}
          onChangeValue={setClauseValue}
          onReset={() => {
            onApplyColumnFilter(activeFilterColumn, null)
            closeFilter()
          }}
          onApply={applyFilter}
        />
      ) : null}
    </>
  )
}
