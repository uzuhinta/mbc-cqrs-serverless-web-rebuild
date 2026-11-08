import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { pruneDist } from './prune-dist.ts'

function fixture(files: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'prune-dist-'))
  for (const [file, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, file)), { recursive: true })
    writeFileSync(join(dir, file), content)
  }
  return dir
}

describe('pruneDist', () => {
  it('removes the modules no entry reaches, their maps and emptied folders', () => {
    const dir = fixture({
      'package.json': JSON.stringify({
        exports: {
          '.': { types: './dist/index.d.ts', default: './dist/index.js' },
          './core': { default: './dist/core/index.js' },
          './styles.css': './dist/styles.css',
        },
      }),
      'dist/index.js':
        "import { a } from './a.js'\nconst b = () => import('./lazy/b.js')",
      'dist/a.js': 'export const a = 1\n//# sourceMappingURL=a.js.map\n',
      'dist/lazy/b.js': '',
      'dist/core/index.js': "export * from '../a.js'",
      'dist/types.js': 'export {}',
      'dist/types.js.map': '{}',
      'dist/types.d.ts':
        'export type T = 1\n//# sourceMappingURL=types.d.ts.map\n',
      'dist/a.js.map': '{}',
      'dist/_virtual/_rolldown/runtime.js': 'export {}',
      'dist/styles.css': '',
      // A folder after a kept file: every folder is visited.
      'dist/zz/unused.js': 'export {}',
    })
    expect(pruneDist(dir).sort()).toEqual([
      'dist/_virtual/_rolldown/runtime.js',
      'dist/types.js',
      'dist/zz/unused.js',
    ])
    for (const kept of [
      'index.js',
      'a.js',
      'lazy/b.js',
      'core/index.js',
      'types.d.ts',
      'styles.css',
    ])
      expect(existsSync(join(dir, 'dist', kept))).toBe(true)
    expect(existsSync(join(dir, 'dist/types.js.map'))).toBe(false)
    expect(existsSync(join(dir, 'dist/_virtual'))).toBe(false)
    expect(existsSync(join(dir, 'dist/zz'))).toBe(false)
    // A map comment stays only where its map is.
    expect(readFileSync(join(dir, 'dist/types.d.ts'), 'utf8')).toBe(
      'export type T = 1\n'
    )
    expect(readFileSync(join(dir, 'dist/a.js'), 'utf8')).toContain(
      'sourceMappingURL=a.js.map'
    )
  })

  it('follows every export condition, nested ones too', () => {
    const dir = fixture({
      'package.json': JSON.stringify({
        exports: {
          '.': { types: './dist/index.d.ts', import: './dist/index.js' },
          './web': {
            browser: { default: './dist/web.js' },
            node: './dist/node.js',
          },
        },
      }),
      'dist/index.js': '',
      'dist/web.js': '',
      'dist/node.js': '',
    })
    expect(pruneDist(dir)).toEqual([])
  })

  it('refuses an export whose module is missing instead of pruning everything', () => {
    const dir = fixture({
      'package.json': JSON.stringify({ exports: { '.': './dist/gone.js' } }),
      'dist/other.js': '',
    })
    expect(() => pruneDist(dir)).toThrow(/dist\/gone\.js/)
    expect(existsSync(join(dir, 'dist/other.js'))).toBe(true)
  })
})
