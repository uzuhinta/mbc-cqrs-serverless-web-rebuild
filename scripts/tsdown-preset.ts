import type { UserConfig } from 'tsdown'

export function libraryConfig(overrides: UserConfig = {}): UserConfig {
  const config: UserConfig = {
    entry: ['src/**/*.{ts,tsx}', '!src/**/*.test.{ts,tsx}'],
    unbundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'es2022',
    tsconfig: 'tsconfig.build.json',
    dts: true,
    fixedExtension: false,
    sourcemap: true,
    clean: true,
    deps: {
      neverBundle: [/^react($|\/)/, /^react-dom($|\/)/],
    },
    inputOptions: {
      onLog(level, log, defaultHandler) {
        // Unbundled output keeps each module's "use client" (guarded by the
        // build-output tests), so Rolldown's bundling warning does not apply.
        if (log.code === 'MODULE_LEVEL_DIRECTIVE') return
        defaultHandler(level, log)
      },
    },
  }
  return { ...config, ...overrides }
}
