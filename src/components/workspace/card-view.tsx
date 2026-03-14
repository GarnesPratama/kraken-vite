import type { RecordItem } from '@/modules/workspace/components/list-view'
import { Pencil } from 'lucide-react'


type CardViewProps = {
  records: RecordItem[]
  visibleColumns: string[]
  selectedRecordId?: string
  canEdit: boolean
  getRecordTitle: (record: RecordItem) => string
  onEditRecord: (record: RecordItem) => void
  onSelectRecord: (record: RecordItem) => void
}

export function CardView({
  records,
  visibleColumns,
  selectedRecordId,
  canEdit,
  getRecordTitle,
  onEditRecord,
  onSelectRecord,
}: CardViewProps) {
  return (
    <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
      {records.map((record, index) => {
        const selected = String(record.id ?? '') === String(selectedRecordId ?? '')
        return (
          <div
            key={String(record.id ?? index)}
            className={`rounded-lg border p-3 transition-colors ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-indigo-100 hover:bg-slate-50'}`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-[#33437a]">{getRecordTitle(record)}</p>
              <button
                type="button"
                onClick={() => onEditRecord(record)}
                disabled={!canEdit}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                title="Edit card"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
            <div onClick={() => onSelectRecord(record)} className="space-y-1 text-xs text-slate-600">
              {visibleColumns.slice(0, 4).map((column) => (
                <p key={`${String(record.id ?? index)}-${column}`} className="flex justify-between gap-3">
                  <span className="text-slate-500">{column}</span>
                  <span className="truncate">{String(record[column] ?? '-')}</span>
                </p>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
