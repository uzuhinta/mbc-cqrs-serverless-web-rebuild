import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sources(path)
    return /\.tsx?$/.test(entry.name) && !/\.test(-d)?\.tsx?$/.test(entry.name)
      ? [path]
      : []
  })
}

/** Every string literal in the source (quotes inside other strings stay inside). */
function stringLiterals(source: string): string[] {
  return [
    ...source.matchAll(
      /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g
    ),
  ].map(([, double, single, template]) => double ?? single ?? template ?? '')
}

/**
 * The tokens of a class list that lack the `mbc:` prefix. A string is a class
 * list when it holds an `mbc:` class: a class without the prefix there
 * compiles to nothing (Tailwind only scans prefixed ones), so no output test
 * can see it.
 */
function unprefixedTokens(source: string): string[] {
  return stringLiterals(source)
    .filter((literal) => /(^|\s)mbc:/.test(literal))
    .flatMap((literal) =>
      literal
        .replace(/\$\{[^}]*\}/g, ' ')
        .split(/\s+/)
        .filter((token) => token !== '' && !token.startsWith('mbc:'))
    )
}

describe('unprefixedTokens', () => {
  it('finds a class without the prefix in a class list', () => {
    expect(
      unprefixedTokens(
        `cn('mbc:flex gap-2', "mbc:[&_svg:not([class*='size-'])]:size-4")`
      )
    ).toEqual(['gap-2'])
  })
})

describe('library source', () => {
  it.each(['ui-web', 'survey-web', 'master-web'])(
    '%s prefixes every class in its class lists',
    (pkg) => {
      const dir = join(root, 'packages', pkg, 'src')
      const offenders = sources(dir).flatMap((file) =>
        unprefixedTokens(readFileSync(file, 'utf8')).map(
          (token) => `${relative(dir, file)}: ${token}`
        )
      )
      expect(offenders).toEqual([])
    }
  )
})
