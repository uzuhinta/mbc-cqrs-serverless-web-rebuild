import { cpSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SKILL = 'mbc-cqrs-serverless-web'

/**
 * Copies the usage skill for Claude Code (repo `skills/<name>`) into a
 * package's `dist/skills/`, without its evals, so every package ships the
 * skill of its own version.
 */
export function copySkill(packageDir: string): void {
  const from = fileURLToPath(new URL(`../skills/${SKILL}`, import.meta.url))
  const to = join(packageDir, 'dist', 'skills', SKILL)
  rmSync(to, { recursive: true, force: true })
  cpSync(from, to, {
    recursive: true,
    filter: (source) => !source.startsWith(join(from, 'evals')),
  })
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  copySkill(process.cwd())
}
