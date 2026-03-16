import { axelorJson } from '@/services/http/axelor-http'
import type { ActionExecResponse, ActionResponse, ActionViewSummary, ApiListResponse, AppInfo, FetchResponse, MenuItem, MetaViewResponse, PermsResponse, QuickAccessSection, RemoveResponse, SaveResponse, SearchResponse, SessionInfoResponse } from '@/types/menu'


function normalizeAppInfo(raw: SessionInfoResponse | Record<string, unknown>): AppInfo {
  const legacy = raw as Record<string, unknown>
  const isLegacyMap = typeof legacy['application.name'] === 'string'

  if (isLegacyMap) {
    return {
      applicationName: String(legacy['application.name'] ?? 'Axelor App'),
      applicationDescription: String(legacy['application.description'] ?? ''),
      userDisplayName: String(legacy['user.name'] ?? ''),
      userLogin: String(legacy['user.login'] ?? ''),
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
    jsonBody: {
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

export async function fetchMetaView(model: string, limit = 8, signal?: AbortSignal): Promise<Array<Record<string, unknown>>> {
  const response = await axelorJson<MetaViewResponse>(`ws/meta/view`, {
    method: 'POST',
    signal,
    jsonBody: {
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

export async function fetchModelRecords(model: string, limit = 8): Promise<Array<Record<string, unknown>>> {
  const response = await axelorJson<SearchResponse>(`ws/rest/${model}/search`, {
    method: 'POST',
    jsonBody: {
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
    jsonBody: {
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
    jsonBody: {},
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
    jsonBody: {
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
    jsonBody: { records },
  })

  if (response.status !== 0) {
    throw new Error(`Gagal menghapus data model ${model}`)
  }

  return response.data?.length ?? 0
}
