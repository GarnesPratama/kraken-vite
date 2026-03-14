import { useMemo } from 'react'
import type { ReactNode } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
} from 'lucide-react'
import { AppButton } from '@/components/global/ui/button'
import { CardView } from './components/card-view'
import { FormView } from './components/form-view'
import { ListView } from './components/list-view'
import { NavTabs } from './components/nav-tabs'
import { useWorkspaceController } from './hooks/use-workspace-controller'
import { toHashRoute, type MenuNode } from './hooks/controllers/workspace-utils'


function renderMenuTree(params: {
  nodes: MenuNode[]
  depth?: number
  isExpanded: (name: string) => boolean
  isSelected: (name: string) => boolean
  onToggle: (name: string) => void
  onOpen: (node: MenuNode) => void
}): ReactNode {
  const { nodes, depth = 0, isExpanded, isSelected, onToggle, onOpen } = params

  return nodes.map((node) => {
    const hasChildren = node.children.length > 0
    const expanded = isExpanded(node.item.name)
    const selected = isSelected(node.item.name)
    const indent = depth > 0 ? { paddingLeft: `${12 + depth * 10}px` } : undefined

    return (
      <div key={node.item.name}>
        <button
          type="button"
          onClick={() => {
            if (hasChildren) onToggle(node.item.name)
            else onOpen(node)
          }}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${selected ? 'bg-[#7469ec] text-white' : 'text-[#4f5b87] hover:bg-indigo-50'}`}
          style={indent}
        >
          <span className="truncate">{node.item.title}</span>
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : node.item.hasTag ? (
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{node.item.tag}</span>
          ) : null}
        </button>

        {hasChildren && expanded
          ? (
            <div className="space-y-1">
              {renderMenuTree({
                nodes: node.children,
                depth: depth + 1,
                isExpanded,
                isSelected,
                onToggle,
                onOpen,
              })}
            </div>
          )
          : null}
      </div>
    )
  })
}

export function WorkspaceLayout() {
  const controller = useWorkspaceController()

  const renderedMenuTree = useMemo(
    () =>
      renderMenuTree({
        nodes: controller.filteredMenuTree,
        isExpanded: (name) => controller.expandedMenuNames.has(name) || controller.menuSearch.trim().length > 0,
        isSelected: (name) => controller.state.selectedMenuName === name,
        onToggle: controller.toggleMenuExpand,
        onOpen: (node) => controller.openMenuAsTab(node.item),
      }),
    [
      controller.filteredMenuTree,
      controller.expandedMenuNames,
      controller.menuSearch,
      controller.state.selectedMenuName,
      controller.toggleMenuExpand,
      controller.openMenuAsTab,
    ],
  )

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f4f6fb] text-slate-800 lg:grid-cols-[264px_1fr]">
      <aside className={`${controller.state.sidebarOpen ? 'block' : 'hidden'} border-r border-indigo-100 bg-[#eef1f8] lg:block`}>
        <header className="flex h-14 items-center gap-2 border-b border-indigo-100 px-4">
          <button
            type="button"
            onClick={() => controller.actions.setSidebarOpen(false)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-2xl font-semibold italic leading-none text-[#2d3f78]">Artanis</p>
        </header>

        <div className="p-3">
          <div className="mb-3">
            <input
              value={controller.menuSearch}
              onChange={(event) => controller.setMenuSearch(event.target.value)}
              placeholder="Search menu..."
              className="w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-300 focus:ring"
            />
          </div>

          <nav className="space-y-1">
            {controller.menuQuery.isLoading ? <p className="px-2 py-1 text-sm text-slate-500">Memuat menu...</p> : null}
            {!controller.menuQuery.isLoading && controller.filteredMenuTree.length === 0 ? (
              <p className="px-2 py-1 text-sm text-slate-500">Menu tidak ditemukan.</p>
            ) : null}
            {renderedMenuTree}
          </nav>
        </div>
      </aside>

      <section className="grid grid-rows-[52px_44px_1fr]">
        <header className="flex items-center justify-between border-b border-indigo-100 bg-white px-3">
          <div className="flex items-center gap-2">
            {!controller.state.sidebarOpen ? (
              <button
                type="button"
                onClick={() => controller.actions.setSidebarOpen(true)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-200"
              >
                <Menu className="h-5 w-5" />
              </button>
            ) : null}
            <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={controller.refreshCurrentData} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-5 text-sm text-[#4f5b87]">
            {/* {controller.quickQuery.data?.slice(0, 2).map((section) => (
              <button key={section.title} type="button" className="flex items-center gap-1 hover:text-indigo-700">
                {section.title}
                <ChevronDown className="h-4 w-4" />
              </button>
            ))} */}
            {/* <button type="button" className="hover:text-indigo-700">
              <Star className="h-4 w-4" />
            </button>
            <button type="button" className="hover:text-indigo-700">
              <Bell className="h-4 w-4" />
            </button> */}
            <AppButton variant="secondary" onClick={() => controller.logoutMutation.mutate()} className="px-3 py-1.5 text-xs">
              Logout
            </AppButton>
          </div>
        </header>

        <NavTabs
          tabs={controller.state.openTabs}
          activeTabId={controller.state.activeTabId}
          onChange={controller.actions.setActiveTab}
          onClose={controller.actions.closeTab}
          getTabHref={(tab, index) => toHashRoute(tab, index + 1, controller.isFormOpen ? 'form' : tab.viewMode)}
        />

        <div className="px-3 py-2">
          <section className="overflow-hidden rounded-lg border border-indigo-100 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 px-3 py-2">
              <div className="flex items-center gap-2 text-slate-500">
                <button
                  type="button"
                  onClick={controller.startCreateRecord}
                  disabled={!controller.canCreate}
                  className="rounded p-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Create"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={controller.startEditRecord}
                  disabled={!controller.selectedRecord || !controller.canEdit}
                  className="rounded p-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => controller.deleteRecordMutation.mutate()}
                  disabled={!controller.selectedRecord || !controller.canRemove || controller.deleteRecordMutation.isPending}
                  className="rounded p-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={controller.refreshCurrentData} className="rounded p-1 hover:bg-slate-100">
                  <RefreshCw className="h-4 w-4" />
                </button>
                {/* <button type="button" className="flex items-center gap-1 rounded px-2 py-1 text-[#465184] hover:bg-slate-100">
                  <Printer className="h-4 w-4" />
                  Print catalog
                </button> */}
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-500">
                {controller.activeTab ? (
                  <div className="flex items-center gap-1 rounded border border-indigo-100 bg-slate-50 p-0.5">
                    {controller.activeModes.includes('list') ? (
                      <button
                        type="button"
                        onClick={() => controller.actions.setTabViewMode(controller.activeTab!.id, 'list')}
                        className={`rounded px-2 py-1 ${controller.activeTab.viewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-white'}`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    ) : null}
                    {controller.activeModes.includes('cards') ? (
                      <button
                        type="button"
                        onClick={() => controller.actions.setTabViewMode(controller.activeTab!.id, 'cards')}
                        className={`rounded px-2 py-1 ${controller.activeTab.viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-white'}`}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                    ) : null}
                    {controller.isFormOpen ? (
                      <button
                        type="button"
                        onClick={controller.cancelFormEdit}
                        className="rounded bg-white px-2 py-1 text-xs text-indigo-700 shadow-sm"
                      >
                        Back to list
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <span>
                  1 to {controller.filteredRecords.length}
                  {controller.activeRecordsQuery.data?.length ? ` of ${controller.activeRecordsQuery.data.length}` : ''}
                </span>
                <button type="button" className="rounded p-1 hover:bg-slate-100">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {controller.activeActionQuery.isLoading ? <p className="px-4 py-3 text-sm text-slate-500">Memuat action view...</p> : null}
              {controller.activeActionQuery.isError ? <p className="px-4 py-3 text-sm text-red-600">Action gagal dimuat dari server.</p> : null}
              {!controller.activeTab ? <p className="px-4 py-3 text-sm text-slate-500">Pilih menu kiri untuk membuka dynamic tab view.</p> : null}

              {controller.activeRecordsQuery.isLoading ? <p className="px-4 py-3 text-sm text-slate-500">Memuat data model dari backend...</p> : null}
              {controller.activeRecordsQuery.isError ? <p className="px-4 py-3 text-sm text-red-600">Data model gagal dimuat dari endpoint ws/rest.</p> : null}
              {controller.activePermsQuery.isLoading ? <p className="px-4 py-1 text-xs text-slate-500">Memuat perms...</p> : null}
              {controller.activePermsQuery.isError ? <p className="px-4 py-1 text-xs text-red-600">Perms gagal dimuat.</p> : null}
              {controller.activeRecordFetchQuery.isLoading && controller.isFormOpen ? (
                <p className="px-4 py-1 text-xs text-slate-500">Memuat detail record (fetch)...</p>
              ) : null}

              {!controller.showFormPage && controller.activeTab?.viewMode !== 'cards' && controller.filteredRecords.length ? (
                <ListView
                  records={controller.filteredRecords}
                  visibleColumns={controller.visibleColumns}
                  selectedRecordId={String(controller.selectedRecord?.id ?? '')}
                  canEdit={controller.canEdit}
                  columnFilters={controller.activeColumnFilters}
                  onApplyColumnFilter={controller.setColumnFilter}
                  renderCell={controller.renderCell}
                  onEditRecord={controller.startEditForRecord}
                  onSelectRecord={controller.selectRecord}
                />
              ) : null}

              {!controller.showFormPage && controller.activeTab?.viewMode === 'cards' && controller.filteredRecords.length ? (
                <CardView
                  records={controller.filteredRecords}
                  visibleColumns={controller.visibleColumns}
                  selectedRecordId={String(controller.selectedRecord?.id ?? '')}
                  canEdit={controller.canEdit}
                  getRecordTitle={controller.getRecordTitle}
                  onEditRecord={controller.startEditForRecord}
                  onSelectRecord={controller.selectRecord}
                />
              ) : null}

              {controller.showFormPage ? (
                <FormView
                  formIntent={controller.activeFormIntent}
                  formRecord={controller.activeFormRecord ?? {}}
                  isSaving={controller.saveRecordMutation.isPending}
                  saveErrorMessage={controller.saveErrorMessage}
                  getRecordTitle={controller.getRecordTitle}
                  onSave={() => controller.saveRecordMutation.mutate()}
                  onCancel={controller.cancelFormEdit}
                  onUpdateField={controller.updateDraftField}
                />
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
