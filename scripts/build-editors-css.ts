import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import postcss, { type AtRule } from 'postcss'

/** A library stylesheet and the class fragment every kept selector must contain. */
export type EditorStylesheet = { file: string; marker: string }

/**
 * The stylesheets `editors.css` is built from. `@uiw/react-md-editor` is not
 * here: its JavaScript imports its own CSS, which is already scoped.
 */
export const EDITOR_STYLESHEETS: readonly EditorStylesheet[] = [
  { file: 'react-quill-new/dist/quill.snow.css', marker: 'ql-' },
  { file: 'jsoneditor/dist/jsoneditor.css', marker: 'jsoneditor' },
]

const GLOBAL_SELECTOR = /(^|[\s>+~(,])(:root|html|body)(?![\w-])/
const KEYFRAMES = /keyframes$/

function isKeyframe(node: { parent?: unknown }): boolean {
  const parent = node.parent as AtRule | undefined
  return parent?.type === 'atrule' && KEYFRAMES.test(parent.name)
}

/**
 * Keeps only selectors that contain the library's `marker` and none of
 * `:root`, `html` or `body`; drops at-rules left empty and keyframes no kept
 * rule uses. `rewriteUrl` gives the new address of a file the CSS points at.
 */
export function scopeEditorCss(
  css: string,
  marker: string,
  rewriteUrl?: (url: string) => string
): string {
  const root = postcss.parse(css)
  root.walkRules((rule) => {
    if (isKeyframe(rule)) return
    const kept = rule.selectors.filter(
      (selector) => selector.includes(marker) && !GLOBAL_SELECTOR.test(selector)
    )
    if (kept.length === 0) rule.remove()
    else rule.selectors = kept
  })

  const used = new Set<string>()
  root.walkDecls(/^(-\w+-)?animation(-name)?$/, (decl) => {
    for (const word of decl.value.split(/[\s,]+/)) used.add(word)
  })
  root.walkAtRules(KEYFRAMES, (atRule) => {
    if (!used.has(atRule.params.trim())) atRule.remove()
  })

  // Emptied blocks may sit inside other blocks: repeat until none is left.
  for (let removed = true; removed;) {
    removed = false
    root.walkAtRules((atRule) => {
      if (atRule.nodes && atRule.nodes.length === 0) {
        atRule.remove()
        removed = true
      }
    })
  }

  if (rewriteUrl)
    root.walkDecls((decl) => {
      decl.value = decl.value.replace(
        /url\((['"]?)([^'")]+)\1\)/g,
        (match, _quote: string, url: string) =>
          url.startsWith('data:') ? match : `url("${rewriteUrl(url)}")`
      )
    })
  return root.toString()
}

const ASSETS = 'editors-assets'

function main(): void {
  const resolveFrom = createRequire(resolve('package.json'))
  mkdirSync(`dist/${ASSETS}`, { recursive: true })
  const parts = EDITOR_STYLESHEETS.map(({ file, marker }) => {
    const path = resolveFrom.resolve(file)
    // Files the CSS points at (jsoneditor's icon sprite) are copied next to
    // editors.css; the host's bundler emits them like any CSS asset.
    return scopeEditorCss(readFileSync(path, 'utf8'), marker, (url) => {
      const name = basename(url)
      copyFileSync(resolve(dirname(path), url), `dist/${ASSETS}/${name}`)
      return `./${ASSETS}/${name}`
    })
  })
  writeFileSync(
    'dist/editors.css',
    `/* Rich editors' styles for @mbc-cqrs-serverless/master-web/editors: ${EDITOR_STYLESHEETS.map((sheet) => sheet.file).join(', ')}, scoped to their own classes. */\n${parts.join('\n')}`
  )
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
