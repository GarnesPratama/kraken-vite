import { createContext, useContext, useMemo, useReducer } from 'react'
import type { ReactNode } from 'react'
import type { UserSession } from '@/types/auth'

export type AppTab = {
  id: string
  title: string
  menuName: string
  actionKey: string
  viewMode: string
}

type AppState = {
  session: UserSession | null
  sidebarOpen: boolean
  selectedMenuName: string | null
  openTabs: AppTab[]
  activeTabId: string | null
}

type AppAction =
  | { type: 'LOGIN_SUCCESS'; payload: UserSession }
  | { type: 'LOGOUT' }
  | { type: 'SET_SIDEBAR_OPEN'; payload: boolean }
  | { type: 'SELECT_MENU'; payload: string }
  | { type: 'OPEN_TAB'; payload: AppTab }
  | { type: 'SET_TAB_VIEW_MODE'; payload: { tabId: string; viewMode: string } }
  | { type: 'SET_ACTIVE_TAB'; payload: string }
  | { type: 'CLOSE_TAB'; payload: string }

const initialState: AppState = {
  session: null,
  sidebarOpen: true,
  selectedMenuName: null,
  openTabs: [],
  activeTabId: null,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return { ...state, session: action.payload }
    case 'LOGOUT':
      return { ...state, session: null, selectedMenuName: null, openTabs: [], activeTabId: null }
    case 'SET_SIDEBAR_OPEN':
      return { ...state, sidebarOpen: action.payload }
    case 'SELECT_MENU':
      return { ...state, selectedMenuName: action.payload }
    case 'OPEN_TAB': {
      const existing = state.openTabs.find((tab) => tab.id === action.payload.id)
      if (existing) {
        return { ...state, activeTabId: existing.id }
      }
      return {
        ...state,
        openTabs: [...state.openTabs, action.payload],
        activeTabId: action.payload.id,
      }
    }
    case 'SET_TAB_VIEW_MODE': {
      const { tabId, viewMode } = action.payload
      return {
        ...state,
        openTabs: state.openTabs.map((tab) => (tab.id === tabId ? { ...tab, viewMode } : tab)),
      }
    }
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTabId: action.payload }
    case 'CLOSE_TAB': {
      const nextTabs = state.openTabs.filter((tab) => tab.id !== action.payload)
      const closedWasActive = state.activeTabId === action.payload

      return {
        ...state,
        openTabs: nextTabs,
        activeTabId: closedWasActive ? (nextTabs.length ? nextTabs[nextTabs.length - 1].id : null) : state.activeTabId,
      }
    }
    default:
      return state
  }
}

const StateContext = createContext<AppState | null>(null)
const DispatchContext = createContext<React.Dispatch<AppAction> | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>{children}</DispatchContext.Provider>
    </StateContext.Provider>
  )
}

export function useAppState() {
  const state = useContext(StateContext)
  if (!state) {
    throw new Error('useAppState harus dipakai di dalam AppStateProvider')
  }
  return state
}

export function useAppActions() {
  const dispatch = useContext(DispatchContext)
  if (!dispatch) {
    throw new Error('useAppActions harus dipakai di dalam AppStateProvider')
  }

  return useMemo(
    () => ({
      loginSuccess: (payload: UserSession) => dispatch({ type: 'LOGIN_SUCCESS', payload }),
      logout: () => dispatch({ type: 'LOGOUT' }),
      setSidebarOpen: (payload: boolean) => dispatch({ type: 'SET_SIDEBAR_OPEN', payload }),
      selectMenu: (payload: string) => dispatch({ type: 'SELECT_MENU', payload }),
      openTab: (payload: AppTab) => dispatch({ type: 'OPEN_TAB', payload }),
      setTabViewMode: (tabId: string, viewMode: string) =>
        dispatch({ type: 'SET_TAB_VIEW_MODE', payload: { tabId, viewMode } }),
      setActiveTab: (payload: string) => dispatch({ type: 'SET_ACTIVE_TAB', payload }),
      closeTab: (payload: string) => dispatch({ type: 'CLOSE_TAB', payload }),
    }),
    [dispatch],
  )
}
