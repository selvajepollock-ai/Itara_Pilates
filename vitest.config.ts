import { defineConfig } from 'vitest/config'
import path from 'node:path'

// Los tests corren en UTC, igual que el servidor de producción: así se detectan los errores de zona horaria.
process.env.TZ = 'UTC'

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
