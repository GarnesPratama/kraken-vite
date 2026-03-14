import { X } from 'lucide-react'
import type { AppTab } from '@/store/app-store'

type NavTabsProps = {
  tabs: AppTab[]
  activeTabId: string | null
  onChange: (tabId: string) => void
  onClose: (tabId: string) => void
  getTabHref?: (tab: AppTab, index: number) => string
}

export function NavTabs({ tabs, activeTabId, onChange, onClose, getTabHref }: NavTabsProps) {
  if (!tabs.length) {
    return (
      <div className="border-b border-indigo-100 bg-white px-4 py-2 text-xs text-slate-500">
        Belum ada tab terbuka. Pilih menu untuk membuka tab.
      </div>
    )
  }

  return (
    <div className="border-b border-indigo-100 bg-white px-2 py-1">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab, index) => {
          const active = tab.id === activeTabId

          return (
            <div
              key={tab.id}
              className={`group flex min-w-[180px] max-w-[280px] items-center justify-between gap-2 rounded-t-md border px-3 py-2 text-sm ${
                active
                  ? 'border-indigo-200 border-b-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <a
                href={getTabHref ? getTabHref(tab, index) : '#'}
                onClick={() => onChange(tab.id)}
                className="truncate text-left"
                title={tab.title}
              >
                {tab.title}
              </a>

              <button
                type="button"
                onClick={() => onClose(tab.id)}
                className="rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700"
                aria-label={`Tutup tab ${tab.title}`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
