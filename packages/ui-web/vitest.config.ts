import { defineProject } from 'vitest/config'

export default defineProject({
  test: {
    name: 'ui-web',
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
  },
})
