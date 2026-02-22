import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Menu,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Settings,
  Star,
  Trash2,
} from 'lucide-react'
import type { AppTab } from '@/app/state'
import { useAppActions, useAppState } from '@/app/state'
import { logoutSession } from '@/features/auth/api'
import {
  deleteModelRecords,
  executeModelAction,
  fetchActionView,
  fetchAppInfo,
  fetchMenuItems,
  fetchModelPerms,
  fetchModelRecord,
  fetchModelRecords,
  fetchQuickAccess,
  saveModelRecord,
} from '@/features/menu/api'
import type { MenuItem } from '@/features/menu/types'
import { AppButton } from '@/shared/ui/button'
import { NavTabs } from './nav-tabs'

type MenuNode = {
  item: MenuItem
  children: MenuNode[]
}

type FormIntent = 'view' | 'create' | 'edit'

function normalizeViewMode(viewType?: string | null) {
  if (!viewType) return 'list'
  const value = viewType.toLowerCase()
  if (value === 'grid') return 'list'
  if (value === 'card') return 'cards'
  return value
}

function getModesFromAction(actionView: { viewType?: string; views?: Array<{ type: string }> } | null | undefined) {
  if (!actionView) return ['list']
  const direct = normalizeViewMode(actionView.viewType)
  const fromViews = (actionView.views ?? []).map((view) => normalizeViewMode(view.type))
  const all = [direct, ...fromViews].filter((mode) => mode === 'list' || mode === 'cards' || mode === 'form')
  return Array.from(new Set(all.length ? all : ['list']))
}

function buildMenuTree(items: MenuItem[]) {
  const visibleItems = items.filter((item) => !item.hidden)
  const byName = new Map<string, MenuNode>()

  for (const item of visibleItems) {
    byName.set(item.name, { item, children: [] })
  }

  const roots: MenuNode[] = []
  for (const node of byName.values()) {
    if (node.item.parent && byName.has(node.item.parent)) {
      byName.get(node.item.parent)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortNodes = (nodes: MenuNode[]) => {
    nodes.sort((left, right) => left.item.order - right.item.order)
    nodes.forEach((node) => sortNodes(node.children))
  }

  sortNodes(roots)
  return roots
}

function filterMenuTree(nodes: MenuNode[], search: string): MenuNode[] {
  if (!search.trim()) {
    return nodes
  }

  const q = search.toLowerCase()
  const walk = (node: MenuNode): MenuNode | null => {
    const children = node.children.map(walk).filter((child): child is MenuNode => child !== null)
    const titleMatch = node.item.title.toLowerCase().includes(q)
    const actionMatch = (node.item.action ?? '').toLowerCase().includes(q)

    if (titleMatch || actionMatch || children.length > 0) {
      return { ...node, children }
    }
    return null
  }

  return nodes.map(walk).filter((node): node is MenuNode => node !== null)
}

function collectExpandableNodeNames(nodes: MenuNode[]) {
  const names = new Set<string>()
  const visit = (node: MenuNode) => {
    if (node.children.length > 0) {
      names.add(node.item.name)
      node.children.forEach(visit)
    }
  }

  nodes.forEach(visit)
  return names
}

function buildParentMap(items: MenuItem[]) {
  return items.reduce<Record<string, string | undefined>>((acc, item) => {
    acc[item.name] = item.parent
    return acc
  }, {})
}

function collectAncestorNames(name: string, parentMap: Record<string, string | undefined>) {
  const names: string[] = []
  let current = parentMap[name]

  while (current) {
    names.push(current)
    current = parentMap[current]
  }

  return names
}

function extractVisibleColumns(records: Array<Record<string, unknown>>) {
  const [first] = records
  if (!first) {
    return []
  }

  return Object.keys(first)
    .filter((key) => !key.startsWith('$'))
    .filter((key) => !['id', 'version', 'selected', 'archived'].includes(key))
    .slice(0, 8)
}

function parseHashRoute(hash: string) {
  const cleaned = hash.replace(/^#\/?/, '')
  const [namespace, actionKey, viewMode = 'list'] = cleaned.split('/')

  if (namespace !== 'ds' || !actionKey) {
    return null
  }

  return {
    actionKey: decodeURIComponent(actionKey),
    viewMode: normalizeViewMode(viewMode),
  }
}

function toHashRoute(tab: AppTab | null, tabIndex: number, modeOverride?: string) {
  if (!tab) {
    return '#/'
  }

  const mode = modeOverride || tab.viewMode || 'list'
  return `#/ds/${encodeURIComponent(tab.actionKey)}/${mode}/${tabIndex}`
}

function renderCell(column: string, value: unknown) {
  if (column.toLowerCase().includes('color') && typeof value === 'string' && value.trim()) {
    return <span className="rounded-full bg-slate-800 px-2 py-1 text-xs font-semibold text-white">{value}</span>
  }

  if (typeof value === 'number') {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }

  return String(value ?? '-')
}

function getRecordTitle(record: Record<string, unknown>) {
  const names = ['name', 'fullName', 'title', 'subject']
  for (const name of names) {
    if (typeof record[name] === 'string' && record[name]) {
      return String(record[name])
    }
  }
  return String(record.id ?? 'Record')
}

export function AppShell() {
  const state = useAppState()
  const actions = useAppActions()
  const queryClient = useQueryClient()
  const hashSyncRef = useRef(false)

  const [selectedRecordByTab, setSelectedRecordByTab] = useState<Record<string, string>>({})
  const [formIntentByTab, setFormIntentByTab] = useState<Record<string, FormIntent>>({})
  const [formDraftByTab, setFormDraftByTab] = useState<Record<string, Record<string, unknown>>>({})
  const [viewModeBeforeFormByTab, setViewModeBeforeFormByTab] = useState<Record<string, string>>({})
  const [menuSearch, setMenuSearch] = useState('')
  const [expandedMenuNames, setExpandedMenuNames] = useState<Set<string>>(new Set())

  const appInfoQuery = useQuery({ queryKey: ['app-info'], queryFn: fetchAppInfo })
  const menuQuery = useQuery({ queryKey: ['menu-all'], queryFn: fetchMenuItems })
  const quickQuery = useQuery({ queryKey: ['menu-quick'], queryFn: fetchQuickAccess })

  const menuTree = useMemo(() => buildMenuTree(menuQuery.data ?? []), [menuQuery.data])
  const filteredMenuTree = useMemo(() => filterMenuTree(menuTree, menuSearch), [menuTree, menuSearch])
  const parentByMenuName = useMemo(() => buildParentMap(menuQuery.data ?? []), [menuQuery.data])

  useEffect(() => {
    if (!menuTree.length) return
    setExpandedMenuNames((prev) => {
      if (prev.size > 0) return prev
      return collectExpandableNodeNames(menuTree)
    })
  }, [menuTree])

  const activeTab = useMemo(() => {
    if (!state.activeTabId) return null
    return state.openTabs.find((tab) => tab.id === state.activeTabId) ?? null
  }, [state.activeTabId, state.openTabs])

  const activeTabIndex = useMemo(() => {
    if (!activeTab) return 1
    const index = state.openTabs.findIndex((tab) => tab.id === activeTab.id)
    return index >= 0 ? index + 1 : 1
  }, [activeTab, state.openTabs])

  const activeFormIntent = activeTab ? formIntentByTab[activeTab.id] ?? 'view' : 'view'
  const isFormOpen = activeFormIntent !== 'view'

  useEffect(() => {
    const hashMode = activeTab ? (isFormOpen ? 'form' : normalizeViewMode(activeTab.viewMode || 'list')) : undefined
    const targetHash = toHashRoute(activeTab, activeTabIndex, hashMode)

    if (window.location.hash !== targetHash) {
      hashSyncRef.current = true
      window.history.replaceState(window.history.state, '', targetHash)
      queueMicrotask(() => {
        hashSyncRef.current = false
      })
    }
  }, [activeTab, activeTabIndex, isFormOpen])

  useEffect(() => {
    if (!menuQuery.data) return

    const applyHashRoute = () => {
      if (hashSyncRef.current) return

      const parsed = parseHashRoute(window.location.hash)
      if (!parsed) return

      const found = menuQuery.data.find((menu) => menu.action === parsed.actionKey)
      if (!found || !found.action) return

      actions.selectMenu(found.name)
      const ancestors = collectAncestorNames(found.name, parentByMenuName)
      if (ancestors.length) {
        setExpandedMenuNames((prev) => {
          const next = new Set(prev)
          ancestors.forEach((name) => next.add(name))
          return next
        })
      }

      actions.openTab({
        id: found.action,
        actionKey: found.action,
        menuName: found.name,
        title: found.title,
        viewMode: parsed.viewMode,
      })
    }

    applyHashRoute()
    window.addEventListener('hashchange', applyHashRoute)
    return () => window.removeEventListener('hashchange', applyHashRoute)
  }, [actions, menuQuery.data, parentByMenuName])

  const activeActionQuery = useQuery({
    queryKey: ['action-view', activeTab?.actionKey],
    queryFn: () => fetchActionView(activeTab!.actionKey),
    enabled: Boolean(activeTab?.actionKey),
  })
  const activeModes = useMemo(() => getModesFromAction(activeActionQuery.data), [activeActionQuery.data])

  useEffect(() => {
    if (!activeTab || !activeActionQuery.data) return
    const currentMode = normalizeViewMode(activeTab.viewMode)
    const defaultMode = normalizeViewMode(activeActionQuery.data.viewType)

    if (isFormOpen && currentMode === 'form') return
    if (!activeModes.includes(currentMode)) {
      actions.setTabViewMode(activeTab.id, defaultMode)
      return
    }
  }, [actions, activeActionQuery.data, activeModes, activeTab, isFormOpen])

  const activeRecordsQuery = useQuery({
    queryKey: ['records', activeActionQuery.data?.model],
    queryFn: () => fetchModelRecords(activeActionQuery.data!.model, 40),
    enabled: Boolean(activeActionQuery.data?.model),
  })

  const visibleColumns = useMemo(() => extractVisibleColumns(activeRecordsQuery.data ?? []), [activeRecordsQuery.data])

  const selectedRecord = useMemo(() => {
    if (!activeTab || !activeRecordsQuery.data?.length) return null

    const selectedId = selectedRecordByTab[activeTab.id]
    const found = activeRecordsQuery.data.find((record) => String(record.id ?? '') === selectedId)
    return found ?? activeRecordsQuery.data[0]
  }, [activeRecordsQuery.data, activeTab, selectedRecordByTab])

  const selectedRecordId = useMemo(() => {
    const value = selectedRecord?.id
    const asNumber = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(asNumber) ? asNumber : null
  }, [selectedRecord])

  const activePermsQuery = useQuery({
    queryKey: ['perms', activeActionQuery.data?.model, selectedRecordId],
    queryFn: () => fetchModelPerms(activeActionQuery.data!.model, selectedRecordId ?? undefined),
    enabled: Boolean(activeActionQuery.data?.model),
  })

  const activeRecordFetchQuery = useQuery({
    queryKey: ['fetch-record', activeActionQuery.data?.model, selectedRecordId],
    queryFn: () => fetchModelRecord(activeActionQuery.data!.model, selectedRecordId!),
    enabled: Boolean(activeActionQuery.data?.model) && typeof selectedRecordId === 'number' && activeFormIntent === 'edit',
  })

  const activeFormDraft = activeTab ? formDraftByTab[activeTab.id] ?? null : null
  const activeFormRecord = activeFormIntent === 'edit' ? activeFormDraft ?? activeRecordFetchQuery.data : activeFormDraft
  const showFormPage = Boolean(isFormOpen && activeFormRecord)

  const activePerms = activePermsQuery.data
  const canCreate = activePermsQuery.isError ? true : (activePerms?.create ?? true)
  const canEdit = activePermsQuery.isError ? true : (activePerms?.write ?? true)
  const canRemove = activePermsQuery.isError ? true : (activePerms?.remove ?? true)

  const logoutMutation = useMutation({
    mutationFn: logoutSession,
    onSettled: () => {
      actions.logout()
    },
  })

  const saveRecordMutation = useMutation({
    mutationFn: async () => {
      if (!activeTab || !activeActionQuery.data?.model) {
        throw new Error('Tab/model belum siap untuk save')
      }

      const draft = formDraftByTab[activeTab.id]
      if (!draft) {
        throw new Error('Tidak ada perubahan untuk disimpan')
      }

      await executeModelAction({
        action: activeTab.actionKey,
        model: activeActionQuery.data.model,
        context: { ...draft, _signal: 'onSave' },
      })

      return saveModelRecord(activeActionQuery.data.model, draft)
    },
    onSuccess: async (savedRecord) => {
      if (!activeTab || !activeActionQuery.data?.model) return

      await queryClient.invalidateQueries({ queryKey: ['records', activeActionQuery.data.model] })

      setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'view' }))
      setFormDraftByTab((prev) => ({ ...prev, [activeTab.id]: savedRecord }))
      setSelectedRecordByTab((prev) => ({ ...prev, [activeTab.id]: String(savedRecord.id ?? '') }))
      const previousMode = viewModeBeforeFormByTab[activeTab.id] || 'list'
      actions.setTabViewMode(activeTab.id, previousMode)
    },
  })

  const deleteRecordMutation = useMutation({
    mutationFn: async () => {
      if (!activeActionQuery.data?.model || !selectedRecordId) {
        throw new Error('Record belum dipilih')
      }

      const versionValue = selectedRecord?.version
      const version = typeof versionValue === 'number' ? versionValue : Number(versionValue)

      await executeModelAction({
        action: activeTab?.actionKey ?? '',
        model: activeActionQuery.data.model,
        context: { ...(selectedRecord ?? {}), _signal: 'onDelete' },
      }).catch(() => undefined)

      return deleteModelRecords(activeActionQuery.data.model, [
        {
          id: selectedRecordId,
          ...(Number.isFinite(version) ? { version } : {}),
        },
      ])
    },
    onSuccess: async () => {
      if (!activeActionQuery.data?.model || !activeTab) return
      await queryClient.invalidateQueries({ queryKey: ['records', activeActionQuery.data.model] })
      setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'view' }))
      setFormDraftByTab((prev) => ({ ...prev, [activeTab.id]: {} }))
      setSelectedRecordByTab((prev) => ({ ...prev, [activeTab.id]: '' }))
      const previousMode = viewModeBeforeFormByTab[activeTab.id] || 'list'
      actions.setTabViewMode(activeTab.id, previousMode)
    },
  })

  function openMenuAsTab(menu: MenuItem) {
    actions.selectMenu(menu.name)

    const ancestors = collectAncestorNames(menu.name, parentByMenuName)
    if (ancestors.length) {
      setExpandedMenuNames((prev) => {
        const next = new Set(prev)
        ancestors.forEach((name) => next.add(name))
        return next
      })
    }

    if (!menu.action) return

    actions.openTab({
      id: menu.action,
      actionKey: menu.action,
      menuName: menu.name,
      title: menu.title,
      viewMode: 'list',
    })
  }

  function startCreateRecord() {
    if (!activeTab || !activeActionQuery.data?.model || !canCreate) return
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
      model: activeActionQuery.data.model,
      context: { _signal: 'onNew' },
    }).catch(() => undefined)
  }

  function startEditRecord() {
    if (!activeTab || !activeActionQuery.data?.model || !selectedRecord || !canEdit) return
    if (activeTab.viewMode !== 'form') {
      setViewModeBeforeFormByTab((prev) => ({ ...prev, [activeTab.id]: activeTab.viewMode || 'list' }))
      actions.setTabViewMode(activeTab.id, 'form')
    }

    const source = (selectedRecord as Record<string, unknown>)
    setFormDraftByTab((prev) => ({ ...prev, [activeTab.id]: { ...source } }))
    setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'edit' }))

    executeModelAction({
      action: activeTab.actionKey,
      model: activeActionQuery.data.model,
      context: { ...source, _signal: 'onLoad' },
    }).catch(() => undefined)
  }

  function startEditForRecord(record: Record<string, unknown>) {
    if (!activeTab) return
    if (activeTab.viewMode !== 'form') {
      setViewModeBeforeFormByTab((prev) => ({ ...prev, [activeTab.id]: activeTab.viewMode || 'list' }))
      actions.setTabViewMode(activeTab.id, 'form')
    }
    setSelectedRecordByTab((prev) => ({ ...prev, [activeTab.id]: String(record.id ?? '') }))

    if (!activeActionQuery.data?.model || !canEdit) return
    const source = { ...record }
    setFormDraftByTab((prev) => ({ ...prev, [activeTab.id]: source }))
    setFormIntentByTab((prev) => ({ ...prev, [activeTab.id]: 'edit' }))

    executeModelAction({
      action: activeTab.actionKey,
      model: activeActionQuery.data.model,
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

  async function refreshCurrentData() {
    if (!activeActionQuery.data?.model) return
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['records', activeActionQuery.data.model] }),
      queryClient.invalidateQueries({ queryKey: ['fetch-record', activeActionQuery.data.model] }),
      queryClient.invalidateQueries({ queryKey: ['perms', activeActionQuery.data.model] }),
      queryClient.invalidateQueries({ queryKey: ['action-view', activeTab?.actionKey] }),
    ])
  }

  function toggleMenuExpand(name: string) {
    setExpandedMenuNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function renderMenuNodes(nodes: MenuNode[], depth = 0): ReactNode {
    return nodes.map((node) => {
      const hasChildren = node.children.length > 0
      const isExpanded = expandedMenuNames.has(node.item.name) || menuSearch.trim().length > 0
      const isSelected = state.selectedMenuName === node.item.name
      const indent = depth > 0 ? { paddingLeft: `${12 + depth * 10}px` } : undefined

      return (
        <div key={node.item.name}>
          <button
            type="button"
            onClick={() => {
              if (hasChildren) toggleMenuExpand(node.item.name)
              else openMenuAsTab(node.item)
            }}
            className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${isSelected ? 'bg-[#7469ec] text-white' : 'text-[#4f5b87] hover:bg-indigo-50'}`}
            style={indent}
          >
            <span className="truncate">{node.item.title}</span>
            {hasChildren ? (
              isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : node.item.hasTag ? (
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{node.item.tag}</span>
            ) : null}
          </button>

          {hasChildren && isExpanded ? <div className="space-y-1">{renderMenuNodes(node.children, depth + 1)}</div> : null}
        </div>
      )
    })
  }

  return (
    <main className="grid min-h-screen grid-cols-1 bg-[#f4f6fb] text-slate-800 lg:grid-cols-[264px_1fr]">
      <aside className={`${state.sidebarOpen ? 'block' : 'hidden'} border-r border-indigo-100 bg-[#eef1f8] lg:block`}>
        <header className="flex h-14 items-center gap-2 border-b border-indigo-100 px-4">
          <button
            type="button"
            onClick={() => actions.setSidebarOpen(false)}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-200 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="text-2xl font-semibold italic leading-none text-[#2d3f78]">Kraken New Gen</p>
        </header>

        <div className="p-3">
          <div className="mb-3">
            <input
              value={menuSearch}
              onChange={(event) => setMenuSearch(event.target.value)}
              placeholder="Search menu..."
              className="w-full rounded-lg border border-indigo-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none ring-indigo-300 focus:ring"
            />
          </div>

          <nav className="space-y-1">
            {menuQuery.isLoading ? <p className="px-2 py-1 text-sm text-slate-500">Memuat menu...</p> : null}
            {!menuQuery.isLoading && filteredMenuTree.length === 0 ? <p className="px-2 py-1 text-sm text-slate-500">Menu tidak ditemukan.</p> : null}
            {renderMenuNodes(filteredMenuTree)}
          </nav>
        </div>
      </aside>

      <section className="grid grid-rows-[52px_44px_1fr]">
        <header className="flex items-center justify-between border-b border-indigo-100 bg-white px-3">
          <div className="flex items-center gap-2">
            {!state.sidebarOpen ? (
              <button
                type="button"
                onClick={() => actions.setSidebarOpen(true)}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-200"
              >
                <Menu className="h-5 w-5" />
              </button>
            ) : null}
            <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button type="button" onClick={refreshCurrentData} className="rounded-md p-1 text-slate-500 hover:bg-slate-100">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-5 text-sm text-[#4f5b87]">
            {quickQuery.data?.slice(0, 2).map((section) => (
              <button key={section.title} type="button" className="flex items-center gap-1 hover:text-indigo-700">
                {section.title}
                <ChevronDown className="h-4 w-4" />
              </button>
            ))}
            <button type="button" className="hover:text-indigo-700">
              <Star className="h-4 w-4" />
            </button>
            <button type="button" className="hover:text-indigo-700">
              <Bell className="h-4 w-4" />
            </button>
            <AppButton variant="secondary" onClick={() => logoutMutation.mutate()} className="px-3 py-1.5 text-xs">
              Logout
            </AppButton>
          </div>
        </header>

        <NavTabs tabs={state.openTabs} activeTabId={state.activeTabId} onChange={actions.setActiveTab} onClose={actions.closeTab} />

        <div className="px-3 py-2">
          <section className="overflow-hidden rounded-lg border border-indigo-100 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-100 px-3 py-2">
              <div className="flex items-center gap-2 text-slate-500">
                <button
                  type="button"
                  onClick={startCreateRecord}
                  disabled={!canCreate}
                  className="rounded p-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Create"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={startEditRecord}
                  disabled={!selectedRecord || !canEdit}
                  className="rounded p-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteRecordMutation.mutate()}
                  disabled={!selectedRecord || !canRemove || deleteRecordMutation.isPending}
                  className="rounded p-1 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <button type="button" onClick={refreshCurrentData} className="rounded p-1 hover:bg-slate-100">
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button type="button" className="flex items-center gap-1 rounded px-2 py-1 text-[#465184] hover:bg-slate-100">
                  <Printer className="h-4 w-4" />
                  Print catalog
                </button>
              </div>

              <div className="flex items-center gap-3 text-sm text-slate-500">
                {activeTab ? (
                  <div className="flex items-center gap-1 rounded border border-indigo-100 bg-slate-50 p-0.5">
                    {activeModes.includes('list') ? (
                      <button
                        type="button"
                        onClick={() => actions.setTabViewMode(activeTab.id, 'list')}
                        className={`rounded px-2 py-1 ${activeTab.viewMode === 'list' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-white'}`}
                      >
                        <List className="h-4 w-4" />
                      </button>
                    ) : null}
                    {activeModes.includes('cards') ? (
                      <button
                        type="button"
                        onClick={() => actions.setTabViewMode(activeTab.id, 'cards')}
                        className={`rounded px-2 py-1 ${activeTab.viewMode === 'cards' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:bg-white'}`}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </button>
                    ) : null}
                    {isFormOpen ? (
                      <button
                        type="button"
                        onClick={cancelFormEdit}
                        className="rounded bg-white px-2 py-1 text-xs text-indigo-700 shadow-sm"
                      >
                        Back to list
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <span>
                  1 to {activeRecordsQuery.data?.length ?? 0}
                  {activeRecordsQuery.data?.length ? ` of ${activeRecordsQuery.data.length}` : ''}
                </span>
                <button type="button" className="rounded p-1 hover:bg-slate-100">
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              {activeActionQuery.isLoading ? <p className="px-4 py-3 text-sm text-slate-500">Memuat action view...</p> : null}
              {activeActionQuery.isError ? <p className="px-4 py-3 text-sm text-red-600">Action gagal dimuat dari server.</p> : null}
              {!activeTab ? <p className="px-4 py-3 text-sm text-slate-500">Pilih menu kiri untuk membuka dynamic tab view.</p> : null}

              {activeRecordsQuery.isLoading ? <p className="px-4 py-3 text-sm text-slate-500">Memuat data model dari backend...</p> : null}
              {activeRecordsQuery.isError ? <p className="px-4 py-3 text-sm text-red-600">Data model gagal dimuat dari endpoint ws/rest.</p> : null}
              {activePermsQuery.isLoading ? <p className="px-4 py-1 text-xs text-slate-500">Memuat perms...</p> : null}
              {activePermsQuery.isError ? <p className="px-4 py-1 text-xs text-red-600">Perms gagal dimuat.</p> : null}
              {activeRecordFetchQuery.isLoading && isFormOpen ? <p className="px-4 py-1 text-xs text-slate-500">Memuat detail record (fetch)...</p> : null}

              {!showFormPage && activeTab?.viewMode !== 'cards' && activeRecordsQuery.data?.length ? (
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-y border-indigo-100 bg-[#f8f9ff] text-[#4d5a88]">
                      <th className="w-10 px-2 py-2 text-left font-semibold"> </th>
                      {visibleColumns.map((column) => (
                        <th key={column} className="px-3 py-2 text-left font-semibold">
                          {column}
                        </th>
                      ))}
                    </tr>
                    <tr className="border-b border-indigo-100 text-slate-400">
                      <th className="px-2 py-2 text-left font-normal"> </th>
                      {visibleColumns.map((column) => (
                        <th key={`${column}-search`} className="px-3 py-2 text-left font-normal">
                          Search...
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {activeRecordsQuery.data.map((record, index) => {
                      const selected = String(record.id ?? '') === String(selectedRecord?.id ?? '')
                      return (
                        <tr
                          key={String(record.id ?? index)}
                          onClick={() => {
                            if (!activeTab) return
                            setSelectedRecordByTab((prev) => ({ ...prev, [activeTab.id]: String(record.id ?? '') }))
                          }}
                          className={`cursor-pointer border-b border-indigo-100 even:bg-[#fbfcff] hover:bg-indigo-50/60 ${selected ? 'bg-indigo-50' : ''}`}
                        >
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation()
                                startEditForRecord(record)
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
              ) : null}

              {!showFormPage && activeTab?.viewMode === 'cards' && activeRecordsQuery.data?.length ? (
                <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                  {activeRecordsQuery.data.map((record, index) => {
                    const selected = String(record.id ?? '') === String(selectedRecord?.id ?? '')
                    return (
                      <div
                        key={String(record.id ?? index)}
                        className={`rounded-lg border p-3 transition-colors ${selected ? 'border-indigo-300 bg-indigo-50' : 'border-indigo-100 hover:bg-slate-50'}`}
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-[#33437a]">{getRecordTitle(record)}</p>
                          <button
                            type="button"
                            onClick={() => startEditForRecord(record)}
                            disabled={!canEdit}
                            className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                            title="Edit card"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                        </div>
                        <div
                          onClick={() => {
                            if (!activeTab) return
                            setSelectedRecordByTab((prev) => ({ ...prev, [activeTab.id]: String(record.id ?? '') }))
                          }}
                          className="space-y-1 text-xs text-slate-600"
                        >
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
              ) : null}

              {showFormPage ? (
                <div className="min-h-[480px] p-4">
                  <div className="mb-4 flex items-center justify-between border-b border-indigo-100 pb-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        {activeFormIntent === 'create' ? 'Create Page' : 'Edit Page'}
                      </p>
                      <h3 className="text-xl font-semibold text-[#33437a]">
                        {activeFormIntent === 'create' ? 'Create Record' : `Edit ${getRecordTitle(activeFormRecord)}`}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <AppButton
                        onClick={() => saveRecordMutation.mutate()}
                        disabled={saveRecordMutation.isPending}
                        className="px-3 py-1.5 text-xs"
                      >
                        {saveRecordMutation.isPending ? 'Saving...' : 'Save'}
                      </AppButton>
                      <AppButton variant="ghost" onClick={cancelFormEdit} className="px-3 py-1.5 text-xs">
                        Cancel
                      </AppButton>
                    </div>
                  </div>

                  {saveRecordMutation.isError ? (
                    <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {(saveRecordMutation.error as Error)?.message ?? 'Gagal menyimpan data'}
                    </p>
                  ) : null}

                  <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(activeFormRecord)
                      .filter(([key]) => !key.startsWith('$'))
                      .slice(0, 36)
                      .map(([key, value]) => (
                        <div key={key} className="rounded-md border border-indigo-100 bg-slate-50 px-3 py-2">
                          <p className="text-xs text-slate-500">{key}</p>
                          {['id', 'version'].includes(key) ? (
                            <p className="mt-1 text-sm text-[#3f4c7c]">{String(value ?? '-')}</p>
                          ) : (
                            <input
                              value={String(value ?? '')}
                              onChange={(event) => updateDraftField(key, event.target.value)}
                              className="mt-1 w-full rounded border border-indigo-200 bg-white px-2 py-1 text-sm text-[#3f4c7c] outline-none ring-indigo-300 focus:ring"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
