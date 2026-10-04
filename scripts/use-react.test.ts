import { describe, expect, it } from 'vitest'

import { applyReactVersion, isReactMajor, REACT_VERSIONS } from './use-react.ts'

describe('applyReactVersion', () => {
  it('pins react, react-dom and their types to React 18', () => {
    const result = applyReactVersion({ name: 'root' }, '18')

    expect(result.pnpm?.overrides).toEqual(REACT_VERSIONS['18'])
  })

  it('keeps unrelated fields and overrides', () => {
    const result = applyReactVersion(
      { name: 'root', pnpm: { overrides: { foo: '1.0.0' } } },
      '19'
    )

    expect(result.name).toBe('root')
    expect(result.pnpm?.overrides).toEqual({
      foo: '1.0.0',
      ...REACT_VERSIONS['19'],
    })
  })

  it('returns to the committed state after switching 18 then 19', () => {
    const committed = applyReactVersion({ name: 'root' }, '19')

    expect(applyReactVersion(applyReactVersion(committed, '18'), '19')).toEqual(
      committed
    )
  })
})

describe('isReactMajor', () => {
  it('accepts only 18 and 19', () => {
    expect(isReactMajor('18')).toBe(true)
    expect(isReactMajor('19')).toBe(true)
    expect(isReactMajor('17')).toBe(false)
    expect(isReactMajor(undefined)).toBe(false)
  })
})
