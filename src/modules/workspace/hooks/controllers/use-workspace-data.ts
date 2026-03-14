import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { useAppActions, useAppState } from '@/store/app-store'
import { fetchActionView, fetchMetaView, fetchModelPerms, fetchModelRecords } from '@/services/api/workspace/menu-api'
import type { ColumnFilter, FilterClause } from './workspace-utils'
import { extractVisibleColumns, getModesFromAction } from './workspace-utils'

type AppState = ReturnType<typeof useAppState>

export function useWorkspaceDataController({ state }: { state: AppState; actions: ReturnType<typeof useAppActions> }) {
  const queryClient = useQueryClient()
  const [selectedRecordByTab, setSelectedRecordByTab] = useState<Record<string, string>>({})
  const [columnFiltersByTab, setColumnFiltersByTab] = useState<Record<string, Record<string, ColumnFilter>>>({})

  const activeTab = useMemo(() => {
    if (!state.activeTabId) return null
    return state.openTabs.find((tab) => tab.id === state.activeTabId) ?? null
  }, [state.activeTabId, state.openTabs])

  const activeTabIndex = useMemo(() => {
    if (!activeTab) return 1
    const index = state.openTabs.findIndex((tab) => tab.id === activeTab.id)
    return index >= 0 ? index + 1 : 1
  }, [activeTab, state.openTabs])

  const activeActionQuery = useQuery({
    queryKey: ['action-view', activeTab?.actionKey],
    queryFn: () => fetchActionView(activeTab!.actionKey),
    enabled: Boolean(activeTab?.actionKey),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const activeModes = useMemo(() => getModesFromAction(activeActionQuery.data), [activeActionQuery.data])

  // const metaView = useQuery({
  //   queryKey: ['meta-view', activeActionQuery.data?.model],
  //   queryFn: ({ signal }) => fetchMetaView(activeActionQuery.data!.model, 40, signal),
  //   enabled: Boolean(activeActionQuery.data?.model),
  //   staleTime: 60 * 1000,
  //   gcTime: 10 * 60 * 1000,
  //   refetchOnWindowFocus: false,
  //   refetchOnReconnect: false,
  // })


  const activeRecordsQuery = useQuery({
    queryKey: ['records', activeActionQuery.data?.model],
    queryFn: () => fetchModelRecords(activeActionQuery.data!.model, 40),
    enabled: Boolean(activeActionQuery.data?.model),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const visibleColumns = useMemo(() => extractVisibleColumns(activeRecordsQuery.data ?? []), [activeRecordsQuery.data])

  const activeColumnFilters = useMemo(() => {
    if (!activeTab) return {}
    return columnFiltersByTab[activeTab.id] ?? {}
  }, [activeTab, columnFiltersByTab])

  const filteredRecords = useMemo(() => {
    const records = activeRecordsQuery.data ?? []
    const entries = Object.entries(activeColumnFilters)
    if (!entries.length) return records

    const hasValue = (value: unknown) => String(value ?? '').trim().length > 0
    const normalize = (value: unknown) => String(value ?? '').toLowerCase()

    const runClause = (recordValue: unknown, clause: FilterClause) => {
      const left = normalize(recordValue)
      const right = clause.value.trim().toLowerCase()
      switch (clause.operator) {
        case 'contains':
          return right ? left.includes(right) : true
        case 'equals':
          return right ? left === right : true
        case 'startsWith':
          return right ? left.startsWith(right) : true
        case 'endsWith':
          return right ? left.endsWith(right) : true
        case 'isEmpty':
          return !hasValue(recordValue)
        case 'isNotEmpty':
          return hasValue(recordValue)
      }
    }

    const isClauseActive = (clause?: FilterClause) => {
      if (!clause) return false
      return clause.operator === 'isEmpty' || clause.operator === 'isNotEmpty' || clause.value.trim().length > 0
    }

    return records.filter((record) => {
      return entries.every(([column, filter]) => {
        const [first, second] = filter.clauses
        const firstActive = isClauseActive(first)
        const secondActive = isClauseActive(second)
        if (!firstActive && !secondActive) return true

        const firstResult = firstActive ? runClause(record[column], first) : true
        if (!secondActive) return firstResult

        const secondResult = runClause(record[column], second!)
        return filter.mode === 'AND' ? firstResult && secondResult : firstResult || secondResult
      })
    })
  }, [activeColumnFilters, activeRecordsQuery.data])

  const selectedRecord = useMemo(() => {
    if (!activeTab || !filteredRecords.length) return null

    const selectedId = selectedRecordByTab[activeTab.id]
    const found = filteredRecords.find((record) => String(record.id ?? '') === selectedId)
    return found ?? filteredRecords[0]
  }, [activeTab, filteredRecords, selectedRecordByTab])

  const selectedRecordId = useMemo(() => {
    const value = selectedRecord?.id
    const asNumber = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(asNumber) ? asNumber : null
  }, [selectedRecord])

  const activePermsQuery = useQuery({
    queryKey: ['perms', activeActionQuery.data?.model, selectedRecordId],
    queryFn: () => fetchModelPerms(activeActionQuery.data!.model, selectedRecordId ?? undefined),
    enabled: Boolean(activeActionQuery.data?.model),
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const activePerms = activePermsQuery.data
  const canCreate = activePermsQuery.isError ? true : (activePerms?.create ?? true)
  const canEdit = activePermsQuery.isError ? true : (activePerms?.write ?? true)
  const canRemove = activePermsQuery.isError ? true : (activePerms?.remove ?? true)

  function selectRecord(record: Record<string, unknown>) {
    if (!activeTab) return
    setSelectedRecordByTab((prev) => ({ ...prev, [activeTab.id]: String(record.id ?? '') }))
  }

  function setColumnFilter(column: string, filter: ColumnFilter | null) {
    if (!activeTab) return
    setColumnFiltersByTab((prev) => {
      const current = prev[activeTab.id] ?? {}
      const next = { ...current }
      if (filter) next[column] = filter
      else delete next[column]
      return {
        ...prev,
        [activeTab.id]: next,
      }
    })
  }

  async function refreshCurrentData() {
    if (!activeActionQuery.data?.model) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['records', activeActionQuery.data.model] }),
      queryClient.invalidateQueries({ queryKey: ['fetch-record', activeActionQuery.data.model] }),
      queryClient.invalidateQueries({ queryKey: ['perms', activeActionQuery.data.model] }),
      queryClient.invalidateQueries({ queryKey: ['action-view', activeTab?.actionKey] }),
    ])
  }

  return {
    queryClient,
    activeTab,
    activeTabIndex,
    activeActionQuery,
    activeModes,
    activeRecordsQuery,
    filteredRecords,
    visibleColumns,
    selectedRecord,
    selectedRecordId,
    activePermsQuery,
    canCreate,
    canEdit,
    canRemove,
    selectRecord,
    activeColumnFilters,
    setColumnFilter,
    refreshCurrentData,
    // metaView
  }
}
