import { createFileRoute } from '@tanstack/react-router'
import { LoginForm } from '@/features/auth/login-form'
import { AppShell } from '@/features/shell/app-shell'
import { useAppState } from '@/app/state'

export const Route = createFileRoute('/')({ component: HomePage })

function HomePage() {
  const { session } = useAppState()

  if (!session) {
    return <LoginForm />
  }

  return <AppShell />
}
