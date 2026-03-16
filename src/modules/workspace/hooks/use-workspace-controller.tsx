import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAppActions, useAppState } from '@/store/app-store'
import { logoutSession } from '@/services/api/auth/auth-api'
import { normalizeViewMode, renderCell, getRecordTitle, type MenuNode } from '@/modules/workspace/hooks/controllers/workspace-utils'
import { useWorkspaceDataController } from '@/modules/workspace/hooks/controllers/use-workspace-data'
import { useWorkspaceFormController } from '@/modules/workspace/hooks/controllers/use-workspace-form'
import { useWorkspaceMenuController } from '@/modules/workspace/hooks/controllers/use-workspace-menu'

export type { MenuNode }

export function useWorkspaceController() {
  const state = useAppState()
  const actions = useAppActions()

  const data = useWorkspaceDataController({ state, actions })
  const form = useWorkspaceFormController({
    actions,
    activeTab: data.activeTab,
    activeActionModel: data.activeActionQuery.data?.model,
    selectedRecord: data.selectedRecord,
    selectedRecordId: data.selectedRecordId,
    visibleColumns: data.visibleColumns,
    canCreate: data.canCreate,
    canEdit: data.canEdit,
    selectRecord: data.selectRecord,
    queryClient: data.queryClient,
  })

  const menu = useWorkspaceMenuController({
    state,
    actions,
    activeTab: data.activeTab,
    activeTabIndex: data.activeTabIndex,
    isFormOpen: form.isFormOpen,
  })

  useEffect(() => {
    if (!data.activeTab || !data.activeActionQuery.data) return
    const currentMode = normalizeViewMode(data.activeTab.viewMode)
    const defaultMode = normalizeViewMode(data.activeActionQuery.data.viewType)

    if (form.isFormOpen && currentMode === 'form') return
    if (!data.activeModes.includes(currentMode)) {
      actions.setTabViewMode(data.activeTab.id, defaultMode)
    }
  }, [actions, data.activeActionQuery.data, data.activeModes, data.activeTab, form.isFormOpen])

  const logoutMutation = useMutation({
    mutationFn: logoutSession,
    onSettled: () => {
      actions.logout()
    },
  })

  return {
    actions,
    state,
    menuSearch: menu.menuSearch,
    setMenuSearch: menu.setMenuSearch,
    menuQuery: menu.menuQuery,
    quickQuery: menu.quickQuery,
    filteredMenuTree: menu.filteredMenuTree,
    expandedMenuNames: menu.expandedMenuNames,
    toggleMenuExpand: menu.toggleMenuExpand,
    openMenuAsTab: menu.openMenuAsTab,
    refreshCurrentData: data.refreshCurrentData,
    logoutMutation,
    startCreateRecord: form.startCreateRecord,
    startEditRecord: form.startEditRecord,
    deleteRecordMutation: form.deleteRecordMutation,
    canCreate: data.canCreate,
    canEdit: data.canEdit,
    canRemove: data.canRemove,
    activeTab: data.activeTab,
    activeModes: data.activeModes,
    isFormOpen: form.isFormOpen,
    cancelFormEdit: form.cancelFormEdit,
    activeRecordsQuery: data.activeRecordsQuery,
    filteredRecords: data.filteredRecords,
    activeActionQuery: data.activeActionQuery,
    activePermsQuery: data.activePermsQuery,
    activeRecordFetchQuery: form.activeRecordFetchQuery,
    showFormPage: form.showFormPage,
    visibleColumns: data.visibleColumns,
    selectedRecord: data.selectedRecord,
    startEditForRecord: form.startEditForRecord,
    selectRecord: data.selectRecord,
    activeColumnFilters: data.activeColumnFilters,
    setColumnFilter: data.setColumnFilter,
    renderCell,
    getRecordTitle,
    activeFormIntent: form.activeFormIntent,
    activeFormRecord: form.activeFormRecord,
    saveRecordMutation: form.saveRecordMutation,
    saveErrorMessage: form.saveErrorMessage,
    updateDraftField: form.updateDraftField,
  }
}
