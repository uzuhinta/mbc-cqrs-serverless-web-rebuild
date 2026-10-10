import { describe, expect, it } from 'vitest'

import { scopeEditorCss } from './build-editors-css'

const squash = (css: string) => css.replace(/\s+/g, ' ').trim()

describe('scopeEditorCss', () => {
  it('keeps only selectors that name the library’s classes, never :root, html or body', () => {
    const css = `
      .ql-a, p, body .ql-b, :root .ql-c, html .ql-d { color: red }
      button { margin: 0 }
      .ql-e:hover > svg { fill: blue }
    `
    expect(squash(scopeEditorCss(css, 'ql-'))).toBe(
      '.ql-a { color: red } .ql-e:hover > svg { fill: blue }'
    )
  })

  it('looks inside @media and @supports, and drops the ones left empty', () => {
    const css = `
      @media (pointer: coarse) { .ql-a { color: red } a { color: blue } }
      @supports (counter-set: none) { li { counter-set: x } }
    `
    expect(squash(scopeEditorCss(css, 'ql-'))).toBe(
      '@media (pointer: coarse) { .ql-a { color: red } }'
    )
  })

  it('keeps the keyframes kept rules use and drops the rest', () => {
    const css = `
      .jsoneditor-modal { animation: fade-in 0.3s linear 1, move-up 0.3s }
      .fadein { animation: fadein 0.3s }
      @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
      @keyframes move-up { from { top: 1px } to { top: 0 } }
      @keyframes fadein { from { opacity: 0 } }
    `
    const out = scopeEditorCss(css, 'jsoneditor')
    expect(out).toContain('@keyframes fade-in')
    expect(out).toContain('@keyframes move-up')
    expect(out).not.toContain('@keyframes fadein')
    expect(out).not.toContain('.fadein')
  })

  it('points url() at copied files, and leaves data URLs alone', () => {
    const css = `
      .jsoneditor-a { background: url("./img/icons.svg") }
      .jsoneditor-a2 { background: url(./img/icons.svg) -24px 0 }
      .jsoneditor-b { background: url(data:image/png;base64,AAAA) }
    `
    const copied: string[] = []
    const out = scopeEditorCss(css, 'jsoneditor', (url) => {
      copied.push(url)
      return './editors-assets/icons.svg'
    })
    expect(out).toContain('url("./editors-assets/icons.svg")')
    expect(out).toContain('url("./editors-assets/icons.svg") -24px 0')
    expect(out).toContain('url(data:image/png;base64,AAAA)')
    expect(copied).toEqual(['./img/icons.svg', './img/icons.svg'])
  })
})
