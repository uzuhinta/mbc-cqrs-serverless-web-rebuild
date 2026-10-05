import { renderHook } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'

import { useShuffled } from './use-shuffled'

const ITEMS = ['a', 'b', 'c', 'd']
const reverse = (() => {
  let call = 0
  // Math.random sequence that makes Fisher–Yates reverse the array.
  return () => [0.99, 0, 0.99, 0][call++ % 4] ?? 0
})()

describe('useShuffled', () => {
  it('renders the original order on the server', () => {
    function Probe() {
      return createElement('p', null, useShuffled(ITEMS, true).join(''))
    }
    expect(renderToString(createElement(Probe))).toBe('<p>abcd</p>')
  })

  it('shuffles after mount when enabled', () => {
    const { result } = renderHook(() => useShuffled(ITEMS, true, () => 0))
    expect(result.current).not.toEqual(ITEMS)
    expect([...result.current].sort()).toEqual(ITEMS)
  })

  it('keeps the order when disabled, and is stable across re-renders', () => {
    const disabled = renderHook(() => useShuffled(ITEMS, false))
    expect(disabled.result.current).toEqual(ITEMS)

    const enabled = renderHook(() => useShuffled(ITEMS, true, reverse))
    const first = enabled.result.current
    enabled.rerender()
    expect(enabled.result.current).toBe(first)
  })
})
