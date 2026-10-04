import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'client-web',
    environment: 'node',
    setupFiles: ['./test/setup-dom.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  },
})
