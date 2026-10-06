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

  it('keeps its order when equal items arrive as a new array (host re-render)', () => {
    let calls = 0
    const random = () => {
      calls += 1
      return 0
    }
    const { result, rerender } = renderHook(
      ({ items }) => useShuffled(items, true, random),
      { initialProps: { items: [...ITEMS] } }
    )
    const first = result.current
    rerender({ items: [...ITEMS] })
    expect(result.current).toBe(first)
    expect(calls).toBe(ITEMS.length - 1)
  })

  it('returns new items at once when shuffling is off', () => {
    const { result, rerender } = renderHook(
      ({ items }) => useShuffled(items, false),
      { initialProps: { items: ['a'] } }
    )
    rerender({ items: ['b'] })
    expect(result.current).toEqual(['b'])
  })
})
