import { AppButton } from '@/components/global/ui/button'
import type { RecordItem } from './list-view'

export type FormIntent = 'view' | 'create' | 'edit'

type FormViewProps = {
  formIntent: FormIntent
  formRecord: RecordItem
  isSaving: boolean
  saveErrorMessage: string | null
  getRecordTitle: (record: RecordItem) => string
  onSave: () => void
  onCancel: () => void
  onUpdateField: (fieldName: string, nextValue: string) => void
}

export function FormView({
  formIntent,
  formRecord,
  isSaving,
  saveErrorMessage,
  getRecordTitle,
  onSave,
  onCancel,
  onUpdateField,
}: FormViewProps) {
  return (
    <div className="min-h-[480px] p-4">
      <div className="mb-4 flex items-center justify-between border-b border-indigo-100 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-slate-500">{formIntent === 'create' ? 'Create Page' : 'Edit Page'}</p>
          <h3 className="text-xl font-semibold text-[#33437a]">
            {formIntent === 'create' ? 'Create Record' : `Edit ${getRecordTitle(formRecord)}`}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <AppButton onClick={onSave} disabled={isSaving} className="px-3 py-1.5 text-xs">
            {isSaving ? 'Saving...' : 'Save'}
          </AppButton>
          <AppButton variant="ghost" onClick={onCancel} className="px-3 py-1.5 text-xs">
            Cancel
          </AppButton>
        </div>
      </div>

      {saveErrorMessage ? (
        <p className="mb-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{saveErrorMessage}</p>
      ) : null}

      <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(formRecord)
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
                  onChange={(event) => onUpdateField(key, event.target.value)}
                  className="mt-1 w-full rounded border border-indigo-200 bg-white px-2 py-1 text-sm text-[#3f4c7c] outline-none ring-indigo-300 focus:ring"
                />
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
