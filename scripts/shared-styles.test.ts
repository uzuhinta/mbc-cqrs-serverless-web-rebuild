import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = fileURLToPath(new URL('..', import.meta.url))
const css = (pkg: string, file: string) =>
  readFileSync(`${root}packages/${pkg}/dist/${file}`, 'utf8')

// Each stylesheet re-declares the utilities it uses. Two different files
// would each reset the other's responsive rules (the one loaded last wins),
// so survey-web and master-web build the same file from both packages.
describe('survey-web and master-web stylesheets', () => {
  it.each(['styles.css', 'styles.layer.css'])(
    '%s is the same in both packages, so an app may import either or both',
    (file) => {
      expect(css('survey-web', file) === css('master-web', file)).toBe(true)
    }
  )
})
