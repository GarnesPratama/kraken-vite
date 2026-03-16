export type MenuItem = {
  name: string
  title: string
  parent?: string
  action?: string
  icon?: string
  order: number
  hidden?: boolean
  hasTag?: boolean
  tag?: string
}

export type QuickAccessSection = {
  title: string
  order: number
  showingSelected: boolean
  items: Array<{
    title: string
    action: string
    selected: boolean
  }>
}

export type AppInfo = {
  applicationName: string
  applicationDescription: string
  userDisplayName: string
  userLogin: string
}

export type ActionViewSummary = {
  actionId: number
  title: string
  model: string
  viewType: string
  domain: string | null
  context: Record<string, unknown>
  params: Record<string, unknown>
  views: Array<{
    name: string | null
    type: string
  }>
}
export type ApiListResponse<T> = {
  status: number
  data: T[]
}

export type SessionInfoResponse = {
  application?: {
    name?: string
    description?: string
  }
  user?: {
    name?: string
    login?: string
  }
}

export type ActionResponse = {
  status: number
  data: Array<{
    view: ActionViewSummary
  }>
}

export type SearchResponse = {
  status: number
  offset?: number
  total?: number
  data?: Array<Record<string, unknown>>
}

export type MetaViewResponse = {
  status?: number
  data?: Array<Record<string, unknown>>
}


export type SaveResponse = {
  status: number
  data?: Array<Record<string, unknown>>
}

export type FetchResponse = {
  status: number
  data?: Array<Record<string, unknown>>
}

export type PermsResponse = {
  status: number
  data?: string[]
}

export type ActionExecResponse = {
  status: number
  data?: Array<Record<string, unknown>>
  errors?: Record<string, string>
}

export type RemoveResponse = {
  status: number
  data?: Array<Record<string, unknown>>
}
