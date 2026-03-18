import { Pencil, Trash2 } from 'lucide-react'
import { Grid, GridColumn as Column, type GridCellProps } from '@progress/kendo-react-grid'
import { type GroupDescriptor } from '@progress/kendo-data-query';
import { filterIcon } from '@progress/kendo-svg-icons';
import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { ColumnMenu } from './filter-component';

export type RecordItem = Record<string, unknown>

type ListViewProps = {
  records: RecordItem[]
  visibleColumns: string[]
  selectedRecordId?: string
  canEdit: boolean
  canRemove: boolean
  renderCell: (column: string, value: unknown) => ReactNode
  onEditRecord: (record: RecordItem) => void
  onDeleteRecord: (record: RecordItem) => void
  onSelectRecord: (record: RecordItem) => void
}

export function ListView({
  records,
  visibleColumns,
  selectedRecordId,
  canEdit,
  canRemove,
  renderCell,
  onEditRecord,
  onDeleteRecord,
  onSelectRecord,
}: ListViewProps) {
  const selectionField = '__selected'
  const actionField = '__actions'
  const gridMinWidth = useMemo(() => Math.max(visibleColumns.length * 180 + 160, 640), [visibleColumns.length])

  const gridData = useMemo(
    () =>
      records.map((record) => ({
        ...record,
        [selectionField]: String(record.id ?? '') === String(selectedRecordId ?? ''),
        [actionField]: '',
      })),
    [records, selectedRecordId],
  )

  const CommandCell = (props: GridCellProps) => (
    <td className={`${props.className ?? ''} whitespace-nowrap px-2 py-2`}>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onEditRecord(props.dataItem as RecordItem)
          }}
          disabled={!canEdit}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          title="Edit row"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            onDeleteRecord(props.dataItem as RecordItem)
          }}
          disabled={!canRemove}
          className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          title="Delete row"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </td>
  )

  return (
    <>
      <Grid
        data={gridData}
        dataItemKey="id"
        className="text-sm w-full"
        style={{ width: '100%', minWidth: gridMinWidth }}
        scrollable="scrollable"
        autoProcessData={true}
        sortable={true}
        pageable={true}
        resizable={true}
        groupable={true}
        defaultGroup={[]}
        editable={true}
        defaultSkip={0}
        defaultTake={10}
        columnMenuIcon={filterIcon}
        onRowClick={(event) => onSelectRecord(event.dataItem as RecordItem)}
      >
        <Column
          field={actionField}
          title="Actions"
          filterable={false}
          width="150px"
          cells={{ data: CommandCell }}
        />
        {visibleColumns.map((column) => {
          const cell = (props: GridCellProps) => (
            <td className={`${props.className ?? ''} whitespace-nowrap px-3 py-2 text-[#3f4c7c]`}>
              {renderCell(column, (props.dataItem as RecordItem)[column])}
            </td>
          )
          return <Column key={column} columnMenu={ColumnMenu} field={column} title={column} width="180px" cells={{ data: cell }} />
        })}
      </Grid>
    </>
  )
}
