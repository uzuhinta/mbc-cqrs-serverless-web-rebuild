import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, sep } from 'node:path'

const LEADING_USE_CLIENT =
  /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*(['"])use client\1/

export function hasUseClientDirective(code: string): boolean {
  return LEADING_USE_CLIENT.test(code)
}

export function distDir(packageDir: string): string {
  const dir = join(packageDir, 'dist')
  if (!existsSync(dir)) {
    throw new Error(
      `${dir} does not exist. Run "pnpm build" before the build-output tests.`
    )
  }
  return dir
}

export function listFiles(dir: string, extension: string): string[] {
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .filter((file) => file.endsWith(extension))
    .map((file) => file.split(sep).join('/'))
    .sort()
}

export function readText(dir: string, file: string): string {
  return readFileSync(join(dir, file), 'utf8')
}

/** Host-framework references that must never appear in published JavaScript. */
export const FORBIDDEN_JS_PATTERNS: readonly RegExp[] = [
  /\bprocess\.env\b/,
  /from\s*["']next(?:\/[^"']*)?["']/,
  /from\s*["'](?:nuqs|sonner)["']/,
]
