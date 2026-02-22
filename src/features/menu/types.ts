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
