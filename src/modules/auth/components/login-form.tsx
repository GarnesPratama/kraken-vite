import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Lock, UserRound } from 'lucide-react'
import { loginWithPassword } from '@/services/api/auth/auth-api'
import { AppButton } from '@/components/global/ui/button'
import { useAppActions } from '@/store/app-store'

export function LoginForm() {
  const { loginSuccess } = useAppActions()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loginMutation = useMutation({
    mutationFn: loginWithPassword,
    onSuccess: (session) => {
      setErrorMessage(null)
      loginSuccess(session)
    },
    onError: (error) => {
      setErrorMessage(error instanceof Error ? error.message : 'Login gagal')
    },
  })

  return (
    <main className="grid min-h-screen place-items-center bg-white px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/90 p-6 shadow-2xl">
        <p className="text-xs uppercase tracking-[0.22em] text-sky-300">Artanis</p>
        <h1 className="mt-2 text-2xl font-semibold text-white">Masuk ke workspace</h1>

        <form
          className="mt-6 space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            loginMutation.mutate({ username, password })
          }}
        >
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Username</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3">
              <UserRound className="h-4 w-4 text-slate-500" />
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none"
                autoComplete="username"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">Password</span>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-950 px-3">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                className="h-11 w-full bg-transparent text-sm text-slate-100 outline-none"
                autoComplete="current-password"
              />
            </div>
          </label>

          {errorMessage ? <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200">{errorMessage}</p> : null}

          <AppButton type="submit" disabled={loginMutation.isPending} className="h-11 w-full">
            {loginMutation.isPending ? 'Masuk...' : 'Masuk'}
          </AppButton>
        </form>
      </section>
    </main>
  )
}
