import {
  existsSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, normalize, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The JS files a package's `exports` reach, following relative imports. */
export function reachableModules(packageDir: string): Set<string> {
  const { exports } = JSON.parse(
    readFileSync(join(packageDir, 'package.json'), 'utf8')
  ) as { exports: Record<string, string | { default?: string }> }
  const reached = new Set<string>()
  const visit = (file: string) => {
    if (reached.has(file)) return
    reached.add(file)
    const source = readFileSync(join(packageDir, file), 'utf8')
    for (const [, spec] of source.matchAll(
      /(?:from\s*|import\s*\(?\s*)["'](\.{1,2}\/[^"']+)["']/g
    ))
      if (spec) visit(normalize(join(dirname(file), spec)))
  }
  for (const target of Object.values(exports)) {
    const file = typeof target === 'string' ? target : target.default
    if (file?.endsWith('.js')) visit(normalize(file))
  }
  return reached
}

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(path) : [path]
  })
}

/**
 * Removes the JS modules no entry reaches (type-only modules compile to empty
 * files, and Rolldown may leave a runtime nothing imports), with their maps,
 * and the folders left empty. Their `.d.ts` files stay: types import them.
 * Also drops map comments whose map is not there (the declarations get one
 * from the build although no declaration map is written).
 */
export function pruneDist(packageDir: string): string[] {
  const reached = reachableModules(packageDir)
  const dist = join(packageDir, 'dist')
  const removed: string[] = []
  for (const path of filesUnder(dist)) {
    const file = relative(packageDir, path)
    if (!file.endsWith('.js') || reached.has(file)) continue
    rmSync(path)
    if (existsSync(`${path}.map`)) rmSync(`${path}.map`)
    removed.push(file)
  }
  for (const path of filesUnder(dist)) {
    const source = readFileSync(path, 'utf8')
    const comment = /\n?\/\/# sourceMappingURL=(\S+)\s*$/.exec(source)
    if (!comment?.[1] || comment[1].startsWith('data:')) continue
    if (existsSync(join(dirname(path), comment[1]))) continue
    writeFileSync(path, `${source.slice(0, comment.index)}\n`)
  }
  const prune = (dir: string): boolean => {
    // Visit every folder (no short-circuit), then judge this one.
    const children = readdirSync(dir, { withFileTypes: true }).map(
      (entry) => entry.isDirectory() && prune(join(dir, entry.name))
    )
    const empty = children.every(Boolean)
    if (empty && dir !== dist) rmdirSync(dir)
    return empty
  }
  prune(dist)
  return removed
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  pruneDist(process.cwd())
}
