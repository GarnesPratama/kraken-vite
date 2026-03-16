import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { AppTab } from '@/store/app-store'
import type { useAppActions, useAppState } from '@/store/app-store'
import { fetchAppInfo, fetchMenuItems, fetchQuickAccess } from '@/services/api/workspace/menu-api'
import type { MenuItem } from '@/types/menu'
import {
  buildMenuTree,
  buildParentMap,
  collectAncestorNames,
  collectExpandableNodeNames,
  filterMenuTree,
  parseHashRoute,
  toHashRoute,
} from './workspace-utils'

type AppState = ReturnType<typeof useAppState>
type AppActions = ReturnType<typeof useAppActions>

type Params = {
  state: AppState
  actions: AppActions
  activeTab: AppTab | null
  activeTabIndex: number
  isFormOpen: boolean
}

export function useWorkspaceMenuController({ state, actions, activeTab, activeTabIndex, isFormOpen }: Params) {
  const hashSyncRef = useRef(false)
  const [menuSearch, setMenuSearch] = useState('')
  const [expandedMenuNames, setExpandedMenuNames] = useState<Set<string>>(new Set())

  useQuery({
    queryKey: ['app-info'],
    queryFn: fetchAppInfo,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const menuQuery = useQuery({
    queryKey: ['menu-all'],
    queryFn: fetchMenuItems,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  const quickQuery = useQuery({
    queryKey: ['menu-quick'],
    queryFn: fetchQuickAccess,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })

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

  useEffect(() => {
    const hashMode = activeTab ? (isFormOpen ? 'form' : activeTab.viewMode || 'list') : undefined
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

  function toggleMenuExpand(name: string) {
    setExpandedMenuNames((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

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

  return {
    menuSearch,
    setMenuSearch,
    menuQuery,
    quickQuery,
    filteredMenuTree,
    expandedMenuNames,
    toggleMenuExpand,
    openMenuAsTab,
    selectedMenuName: state.selectedMenuName,
  }
}
