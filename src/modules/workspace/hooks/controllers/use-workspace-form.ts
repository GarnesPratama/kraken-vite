import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { useAppActions } from '@/store/app-store'
import { deleteModelRecords, executeModelAction, fetchModelRecord, saveModelRecord } from '@/services/api/workspace/menu-api'
import type { FormIntent } from '../../components/form-view'

type AppActions = ReturnType<typeof useAppActions>

type Params = {
  actions: AppActions
  activeTab: { id: string; actionKey: string; viewMode: string } | null
  activeActionModel?: string
  selectedRecord: Record<string, unknown> | null
  selectedRecordId: number | null
  visibleColumns: string[]
  canCreate: boolean
  canEdit: boolean
  selectRecord: (record: Record<string, unknown>) => void
  queryClient: { invalidateQueries: (input: { queryKey: unknown[] }) => Promise<unknown> }
}

export function useWorkspaceFormController({
  actions,
  activeTab,
  activeActionModel,
  selectedRecord,
  selectedRecordId,
  visibleColumns,
  canCreate,
  canEdit,
  selectRecord,
  queryClient,
}: Params) {
  const [formIntentByTab, setFormIntentByTab] = useState<Record<string, FormIntent>>({})
  const [formDraftByTab, setFormDraftByTab] = useState<Record<string, Record<string, unknown>>>({})
  const [viewModeBeforeFormByTab, setViewModeBeforeFormByTab] = useState<Record<string, string>>({})

  const activeFormIntent = activeTab ? formIntentByTab[activeTab.id] ?? 'view' : 'view'
  const isFormOpen = activeFormIntent !== 'view'

  const activeRecordFetchQuery = useQuery({
    queryKey: ['fetch-record', activeActionModel, selectedRecordId],
    queryFn: () => fetchModelRecord(activeActionModel!, selectedRecordId!),
    enabled: Boolean(activeActionModel) && typeof selectedRecordId === 'number' && activeFormIntent === 'edit',
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

  const activeFormDraft = activeTab ? formDraftByTab[activeTab.id] ?? null : null
  const activeFormRecord = activeFormIntent === 'edit' ? activeFormDraft ?? activeRecordFetchQuery.data : activeFormDraft
  const showFormPage = Boolean(isFormOpen && activeFormRecord)

  const saveRecordMutation = useMutation({
    mutationFn: async () => {
      if (!activeTab || !activeActionModel) {
        throw new Error('Tab/model belum siap untuk save')
      }

      const draft = formDraftByTab[activeTab.id]
      if (!draft) {
        throw new Error('Tidak ada perubahan untuk disimpan')
      }

      await executeModelAction({
        action: activeTab.actionKey,
        model: activeActionModel,
        context: { ...draft, _signal: 'onSave' },
      })

      return saveModelRecord(activeActionModel, draft)
    },
    onSuccess: async (savedRecord) => {
      if (!activeTab || !activeActionModel) return

      await queryClient.invalidateQueries({ queryKey: ['records', activeActionModel] })

      setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'view' }))
      setFormDraftByTab((prev) => ({ ...prev, [activeTab.id]: savedRecord }))
      selectRecord(savedRecord)
      const previousMode = viewModeBeforeFormByTab[activeTab.id] || 'list'
      actions.setTabViewMode(activeTab.id, previousMode)
    },
  })

  const deleteRecordMutation = useMutation({
    mutationFn: async () => {
      if (!activeActionModel || !selectedRecordId) {
        throw new Error('Record belum dipilih')
      }

      const versionValue = selectedRecord?.version
      const version = typeof versionValue === 'number' ? versionValue : Number(versionValue)

      await executeModelAction({
        action: activeTab?.actionKey ?? '',
        model: activeActionModel,
        context: { ...(selectedRecord ?? {}), _signal: 'onDelete' },
      }).catch(() => undefined)

      return deleteModelRecords(activeActionModel, [
        {
          id: selectedRecordId,
          ...(Number.isFinite(version) ? { version } : {}),
        },
      ])
    },
    onSuccess: async () => {
      if (!activeActionModel || !activeTab) return
      await queryClient.invalidateQueries({ queryKey: ['records', activeActionModel] })
      setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'view' }))
      setFormDraftByTab((prev) => ({ ...prev, [activeTab.id]: {} }))
      selectRecord({ id: '' })
      const previousMode = viewModeBeforeFormByTab[activeTab.id] || 'list'
      actions.setTabViewMode(activeTab.id, previousMode)
    },
  })

  function startCreateRecord() {
    if (!activeTab || !activeActionModel || !canCreate) return
    if (activeTab.viewMode !== 'form') {
      setViewModeBeforeFormByTab((prev) => ({ ...prev, [activeTab.id]: activeTab.viewMode || 'list' }))
      actions.setTabViewMode(activeTab.id, 'form')
    }

    const baseColumns = visibleColumns.length
      ? visibleColumns
      : Object.keys(selectedRecord ?? {}).filter((key) => !key.startsWith('$') && !['id', 'version'].includes(key))

    const draft = baseColumns.reduce<Record<string, unknown>>((acc, key) => {
      acc[key] = ''
      return acc
    }, {})

    setFormDraftByTab((prev) => ({ ...prev, [activeTab.id]: draft }))
    setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'create' }))

    executeModelAction({
      action: activeTab.actionKey,
      model: activeActionModel,
      context: { _signal: 'onNew' },
    }).catch(() => undefined)
  }

  function startEditRecord() {
    if (!activeTab || !activeActionModel || !selectedRecord || !canEdit) return
    if (activeTab.viewMode !== 'form') {
      setViewModeBeforeFormByTab((prev) => ({ ...prev, [activeTab.id]: activeTab.viewMode || 'list' }))
      actions.setTabViewMode(activeTab.id, 'form')
    }

    const source = selectedRecord as Record<string, unknown>
    setFormDraftByTab((prev) => ({ ...prev, [activeTab.id]: { ...source } }))
    setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'edit' }))

    executeModelAction({
      action: activeTab.actionKey,
      model: activeActionModel,
      context: { ...source, _signal: 'onLoad' },
    }).catch(() => undefined)
  }

  function startEditForRecord(record: Record<string, unknown>) {
    if (!activeTab) return
    if (activeTab.viewMode !== 'form') {
      setViewModeBeforeFormByTab((prev) => ({ ...prev, [activeTab.id]: activeTab.viewMode || 'list' }))
      actions.setTabViewMode(activeTab.id, 'form')
    }
    selectRecord(record)

    if (!activeActionModel || !canEdit) return
    const source = { ...record }
    setFormDraftByTab((prev) => ({ ...prev, [activeTab.id]: source }))
    setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'edit' }))

    executeModelAction({
      action: activeTab.actionKey,
      model: activeActionModel,
      context: { ...source, _signal: 'onLoad' },
    }).catch(() => undefined)
  }

  function cancelFormEdit() {
    if (!activeTab) return
    setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'view' }))
    const previousMode = viewModeBeforeFormByTab[activeTab.id] || 'list'
    actions.setTabViewMode(activeTab.id, previousMode)
  }

  function updateDraftField(fieldName: string, nextValue: string) {
    if (!activeTab) return

    setFormDraftByTab((prev) => {
      const current = prev[activeTab.id] ?? {}
      const sample = current[fieldName]
      let parsed: unknown = nextValue

      if (typeof sample === 'number') {
        const asNumber = Number(nextValue)
        parsed = Number.isFinite(asNumber) ? asNumber : nextValue
      } else if (typeof sample === 'boolean') {
        parsed = nextValue === 'true'
      }

      return {
        ...prev,
        [activeTab.id]: {
          ...current,
          [fieldName]: parsed,
        },
      }
    })
  }

  const saveErrorMessage = useMemo(
    () => (saveRecordMutation.isError ? ((saveRecordMutation.error as Error)?.message ?? 'Gagal menyimpan data') : null),
    [saveRecordMutation.error, saveRecordMutation.isError],
  )

  return {
    activeFormIntent,
    isFormOpen,
    activeRecordFetchQuery,
    activeFormRecord,
    showFormPage,
    saveRecordMutation,
    deleteRecordMutation,
    saveErrorMessage,
    startCreateRecord,
    startEditRecord,
    startEditForRecord,
    cancelFormEdit,
    updateDraftField,
  }
}
