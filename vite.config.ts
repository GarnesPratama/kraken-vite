import { defineConfig, loadEnv } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import tsconfigPaths from 'vite-tsconfig-paths'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:8080'
  const proxyContext = env.VITE_PROXY_CONTEXT || '/'
  const targetBase = proxyTarget.replace(/\/$/, '')
  const contextBase = proxyContext === '/' ? '' : proxyContext.replace(/\/$/, '')

  const rewriteToTargetContext = (path: string) => `${contextBase}${path}`

  return {
    plugins: [
      devtools(),
      tsconfigPaths({ projects: ['./tsconfig.json'] }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
    server: {
      proxy: {
        '/ws': {
          target: targetBase,
          changeOrigin: true,
          rewrite: rewriteToTargetContext,
        },
        '/callback': {
          target: targetBase,
          changeOrigin: true,
          rewrite: rewriteToTargetContext,
        },
        '/login': {
          target: targetBase,
          changeOrigin: true,
          rewrite: rewriteToTargetContext,
        },
        '/logout': {
          target: targetBase,
          changeOrigin: true,
          rewrite: rewriteToTargetContext,
        },
      },
    },
  }
})

export default config
