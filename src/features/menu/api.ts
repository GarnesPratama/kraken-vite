import { axelorJson } from '@/lib/axelor-http'
import type { ActionViewSummary, AppInfo, MenuItem, QuickAccessSection } from './types'

type ApiListResponse<T> = {
  status: number
  data: T[]
}

type SessionInfoResponse = {
  application?: {
    name?: string
    description?: string
  }
  user?: {
    name?: string
    login?: string
  }
}

type ActionResponse = {
  status: number
  data: Array<{
    view: ActionViewSummary
  }>
}

type SearchResponse = {
  status: number
  offset?: number
  total?: number
  data?: Array<Record<string, unknown>>
}

type SaveResponse = {
  status: number
  data?: Array<Record<string, unknown>>
}

type FetchResponse = {
  status: number
  data?: Array<Record<string, unknown>>
}

type PermsResponse = {
  status: number
  data?: string[]
}

type ActionExecResponse = {
  status: number
  data?: Array<Record<string, unknown>>
  errors?: Record<string, string>
}

type RemoveResponse = {
  status: number
  data?: Array<Record<string, unknown>>
}

function normalizeAppInfo(raw: SessionInfoResponse | Record<string, unknown>): AppInfo {
  const isLegacyMap = typeof raw['application.name'] === 'string'

  if (isLegacyMap) {
    return {
      applicationName: String(raw['application.name'] ?? 'Axelor App'),
      applicationDescription: String(raw['application.description'] ?? ''),
      userDisplayName: String(raw['user.name'] ?? ''),
      userLogin: String(raw['user.login'] ?? ''),
    }
  }

  const info = raw as SessionInfoResponse
  return {
    applicationName: info.application?.name ?? 'Axelor App',
    applicationDescription: info.application?.description ?? '',
    userDisplayName: info.user?.name ?? '',
    userLogin: info.user?.login ?? '',
  }
}

export async function fetchAppInfo(): Promise<AppInfo> {
  const live = await axelorJson<SessionInfoResponse>('ws/public/app/info')
  return normalizeAppInfo(live)
}

export async function fetchMenuItems(): Promise<MenuItem[]> {
  const live = await axelorJson<ApiListResponse<MenuItem>>('ws/action/menu/all')
  return live.status === 0 ? live.data : []
}

export async function fetchQuickAccess(): Promise<QuickAccessSection[]> {
  const live = await axelorJson<ApiListResponse<QuickAccessSection>>('ws/action/menu/quick')
  return live.status === 0 ? live.data : []
}

export async function fetchActionView(actionName: string): Promise<ActionViewSummary | null> {
  const response = await axelorJson<ActionResponse>(`ws/action/${actionName}`, {
    method: 'POST',
    body: {
      model: 'com.axelor.meta.db.MetaAction',
      data: {
        context: {},
      },
    },
  })

  if (response.status !== 0) {
    throw new Error(`Action ${actionName} gagal dimuat`)
  }

  return response.data[0]?.view ?? null
}

export async function fetchModelRecords(model: string, limit = 8): Promise<Array<Record<string, unknown>>> {
  const response = await axelorJson<SearchResponse>(`ws/rest/${model}/search`, {
    method: 'POST',
    body: {
      limit,
      offset: 0,
      data: {},
    },
  })

  if (response.status !== 0) {
    throw new Error(`Data model ${model} gagal dimuat`)
  }

  return response.data ?? []
}

export async function saveModelRecord(model: string, record: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await axelorJson<SaveResponse>(`ws/rest/${model}`, {
    method: 'POST',
    body: {
      data: record,
    },
  })

  if (response.status !== 0) {
    throw new Error(`Gagal menyimpan data model ${model}`)
  }

  return response.data?.[0] ?? {}
}

export async function fetchModelRecord(model: string, id: number): Promise<Record<string, unknown> | null> {
  const response = await axelorJson<FetchResponse>(`ws/rest/${model}/${id}/fetch`, {
    method: 'POST',
    body: {},
  })

  if (response.status !== 0) {
    throw new Error(`Gagal mengambil detail record ${model}#${id}`)
  }

  return response.data?.[0] ?? null
}

export async function fetchModelPerms(model: string, id?: number): Promise<Record<'read' | 'write' | 'create' | 'remove' | 'export', boolean>> {
  const params = new URLSearchParams()
  if (typeof id === 'number' && Number.isFinite(id)) {
    params.set('id', String(id))
  }

  const suffix = params.size ? `?${params}` : ''
  const response = await axelorJson<PermsResponse>(`ws/rest/${model}/perms${suffix}`, {
    method: 'GET',
  })

  if (response.status !== 0) {
    throw new Error(`Gagal mengambil perms ${model}`)
  }

  const values = (response.data ?? []).map((value) => value.toLowerCase())
  return {
    read: values.includes('read'),
    write: values.includes('write'),
    create: values.includes('create'),
    remove: values.includes('remove'),
    export: values.includes('export'),
  }
}

export async function executeModelAction(input: {
  action: string
  model: string
  context?: Record<string, unknown>
}) {
  const response = await axelorJson<ActionExecResponse>('ws/action', {
    method: 'POST',
    body: {
      action: input.action,
      model: input.model,
      data: {
        context: input.context ?? {},
      },
    },
  })

  if (response.status !== 0) {
    throw new Error(response.errors ? Object.values(response.errors).join(', ') : `Action ${input.action} gagal`)
  }

  return response.data ?? []
}

export async function deleteModelRecords(
  model: string,
  records: Array<{ id: number; version?: number }>,
): Promise<number> {
  const response = await axelorJson<RemoveResponse>(`ws/rest/${model}/removeAll`, {
    method: 'POST',
    body: { records },
  })

  if (response.status !== 0) {
    throw new Error(`Gagal menghapus data model ${model}`)
  }

  return response.data?.length ?? 0
}
