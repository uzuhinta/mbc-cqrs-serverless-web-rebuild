import { act, render, screen } from '@testing-library/react'
import { Component, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LOCKS } from '../../../test/fixtures/creator-surveys'
import type { SurveyItem } from '../../schema/survey-schema'
import {
  createCreatorStore,
  CreatorStoreProvider,
  useCreatorSelector,
} from './store'
import type { CreatorState } from './types'

const initial: CreatorState = { survey: LOCKS, selectedId: null, dirty: false }
const relabel = (label: string) => (item: SurveyItem) =>
  item.type === 'section-header' ? item : { ...item, label }

describe('createCreatorStore', () => {
  it('reduces actions, notifies subscribers and reports changes', () => {
    const onChange = vi.fn()
    const store = createCreatorStore(initial, { onChange })
    const listener = vi.fn()
    store.subscribe(listener)

    store.dispatch({ type: 'updateItem', id: 'q_open', update: relabel('X') })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(
      store.getState(),
      initial,
      expect.objectContaining({ type: 'updateItem' })
    )
  })

  it('stays silent when the reducer refuses an action', () => {
    const onChange = vi.fn()
    const store = createCreatorStore(initial, { onChange })
    const listener = vi.fn()
    store.subscribe(listener)

    store.dispatch({ type: 'remove', id: 'q_locked' })

    expect(listener).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
    expect(store.getState()).toBe(initial)
  })
})

describe('useCreatorSelector', () => {
  it('re-renders only the components whose selected item changed', () => {
    const store = createCreatorStore(initial)
    const renders: Record<string, number> = {}

    function Card({ id }: { id: string }) {
      const item = useCreatorSelector((state) =>
        state.survey.items.find((entry) => entry.id === id)
      )
      renders[id] = (renders[id] ?? 0) + 1
      return <p>{item && 'label' in item ? item.label : ''}</p>
    }

    render(
      <CreatorStoreProvider store={store}>
        <Card id="q_open" />
        <Card id="q_last" />
      </CreatorStoreProvider>
    )
    act(() =>
      store.dispatch({
        type: 'updateItem',
        id: 'q_open',
        update: relabel('Renamed'),
      })
    )

    expect(screen.getByText('Renamed')).toBeInTheDocument()
    expect(renders).toEqual({ q_open: 2, q_last: 1 })
  })

  it('explains a missing provider', () => {
    function Orphan() {
      useCreatorSelector((state) => state.dirty)
      return null
    }
    // React 18 and 19 surface render errors differently; a boundary sees both.
    class Catch extends Component<
      { children: ReactNode },
      { message?: string }
    > {
      override state: { message?: string } = {}
      static getDerivedStateFromError(error: Error) {
        return { message: error.message }
      }
      override render() {
        return this.state.message ? (
          <p>{this.state.message}</p>
        ) : (
          this.props.children
        )
      }
    }
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <Catch>
        <Orphan />
      </Catch>
    )
    expect(screen.getByText(/CreatorStoreProvider/)).toBeInTheDocument()
    errors.mockRestore()
  })
})
