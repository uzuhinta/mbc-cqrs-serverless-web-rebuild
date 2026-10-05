import { expectTypeOf, test } from 'vitest'

import type { SurveyAnswers } from './types'

test('v0 rating and linear-scale answers are numbers', () => {
  expectTypeOf({ stars: 4, nps: 0 }).toExtend<SurveyAnswers>()
})
