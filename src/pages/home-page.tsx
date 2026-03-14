import { LoginForm } from '@/modules/auth/components/login-form'
import { WorkspaceLayout } from '@/modules/workspace/workspace-layout'
import { useAppState } from '@/store/app-store'

export function HomePage() {
  const { session } = useAppState()

  if (!session) {
    return <LoginForm />
  }

  return <WorkspaceLayout />
}
