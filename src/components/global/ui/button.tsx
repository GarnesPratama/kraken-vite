import type { ButtonHTMLAttributes } from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type AppButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
}

const byVariant: Record<ButtonVariant, string> = {
  primary: 'bg-sky-600 text-white hover:bg-sky-500',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600',
  ghost: 'bg-transparent text-slate-200 hover:bg-slate-800',
}

export function AppButton({ variant = 'primary', className = '', ...props }: AppButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60'
  const classes = `${base} ${byVariant[variant]} ${className}`.trim()

  return <button {...props} className={classes} />
}
