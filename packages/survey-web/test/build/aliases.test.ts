// @vitest-environment node
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { distDir, readText } from '../../../../scripts/build-output'

const dist = distDir(fileURLToPath(new URL('../..', import.meta.url)))

describe('deprecated subpaths', () => {
  it('keep v0’s exports and say they are deprecated in the emitted types', () => {
    const form = readText(dist, 'SurveyForm/index.d.ts')
    for (const name of ['SurveyForm', 'SurveyAnswers', 'SurveyAnswerMeta'])
      expect(form).toContain(name)
    expect(form).toContain('@deprecated')
    expect(readText(dist, 'SurveyCreator/index.d.ts')).toContain('@deprecated')
  })
})
