import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@domain': path.resolve(root, 'src/domain'),
      '@infra': path.resolve(root, 'src/infrastructure')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    coverage: { include: ['src/domain/**', 'src/infrastructure/**'] }
  }
})
