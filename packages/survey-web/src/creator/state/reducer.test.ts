import { describe, expect, it } from 'vitest'

import { LOCKS } from '../../../test/fixtures/creator-surveys'
import type { SurveyItem } from '../../schema/survey-schema'
import {
  creatorReducer,
  TITLE_ID,
  type CreatorAction,
  type CreatorState,
} from './reducer'

let n = 0
const ids = (prefix: 'q' | 'sec') => `${prefix}_new${++n}`
const start = (selectedId: string | null = null): CreatorState => ({
  survey: LOCKS,
  selectedId,
  dirty: false,
})
const run = (state: CreatorState, action: CreatorAction) =>
  creatorReducer(state, action, ids)
const idsOf = (state: CreatorState) => state.survey.items.map((i) => i.id)
const item = (state: CreatorState, id: string) =>
  state.survey.items.find((i) => i.id === id) as SurveyItem

describe('creatorReducer', () => {
  it('selects without marking the survey dirty', () => {
    const next = run(start(), { type: 'select', id: 'q_open' })
    expect(next.selectedId).toBe('q_open')
    expect(next.dirty).toBe(false)
  })

  it('edits the title and description', () => {
    const next = run(start(), {
      type: 'updateSurvey',
      title: 'New',
      description: 'D',
    })
    expect(next.survey).toMatchObject({ title: 'New', description: 'D' })
    expect(next.dirty).toBe(true)
  })

  it('adds a question after the selection and selects it', () => {
    const question = { id: 'q_added', type: 'short-text' as const, label: '' }
    const next = run(start('q_open'), { type: 'addQuestion', question })
    expect(idsOf(next).indexOf('q_added')).toBe(4)
    expect(next.selectedId).toBe('q_added')
  })

  it('refuses to add a question into a locked section', () => {
    const state = start('q_in_locked')
    const question = { id: 'q_x', type: 'short-text' as const, label: '' }
    expect(run(state, { type: 'addQuestion', question })).toBe(state)
  })

  it('adds a section after a locked section, not inside it', () => {
    const section = {
      id: 'sec_added',
      type: 'section-header' as const,
      title: 'S',
    }
    const next = run(start('q_in_locked'), { type: 'addSection', section })
    expect(idsOf(next).indexOf('sec_added')).toBe(2)
    expect(
      run(start(TITLE_ID), { type: 'addSection', section }).survey.items.at(-1)
        ?.id
    ).toBe('sec_added')
  })

  it('updates unlocked items and section actions, never locked content', () => {
    const relabel = (label: string) => (i: SurveyItem) =>
      i.type === 'section-header' ? { ...i, title: label } : { ...i, label }

    expect(
      item(
        run(start(), {
          type: 'updateItem',
          id: 'q_open',
          update: relabel('X'),
        }),
        'q_open'
      )
    ).toMatchObject({ label: 'X' })

    const locked = start()
    expect(
      run(locked, { type: 'updateItem', id: 'q_locked', update: relabel('X') })
    ).toBe(locked)
    expect(
      run(locked, {
        type: 'updateItem',
        id: 'sec_locked',
        update: relabel('X'),
      })
    ).toBe(locked)

    const withAction = run(locked, {
      type: 'updateItem',
      id: 'sec_locked',
      update: (i) => ({ ...i, action: { type: 'submit' } }) as SurveyItem,
    })
    expect(item(withAction, 'sec_locked')).toMatchObject({
      action: { type: 'submit' },
    })
  })

  it('changes a question’s type unless it is locked', () => {
    const next = run(start(), {
      type: 'changeType',
      id: 'q_open',
      kind: 'dropdown',
      optionLabel: 'オプション 1',
    })
    expect(item(next, 'q_open')).toMatchObject({
      type: 'dropdown',
      label: 'Open question',
    })
    const state = start()
    expect(
      run(state, {
        type: 'changeType',
        id: 'q_locked',
        kind: 'rating',
        optionLabel: 'x',
      })
    ).toBe(state)
  })

  it('duplicates a question right after itself and selects the copy', () => {
    const next = run(start('q_open'), {
      type: 'duplicate',
      id: 'q_open',
      copySuffix: '（コピー）',
    })
    const copyId = idsOf(next)[4]!
    expect(copyId).toMatch(/^q_new/)
    expect(item(next, copyId)).toMatchObject({
      type: 'short-text',
      label: 'Open question',
    })
    expect(next.selectedId).toBe(copyId)
    const state = start()
    expect(
      run(state, { type: 'duplicate', id: 'q_locked', copySuffix: '' })
    ).toBe(state)
    expect(
      run(state, { type: 'duplicate', id: 'q_in_locked', copySuffix: '' })
    ).toBe(state)
  })

  it('duplicates a locked section as an unlocked copy after it', () => {
    const next = run(start(), {
      type: 'duplicate',
      id: 'sec_locked',
      copySuffix: '（コピー）',
    })
    const [header, question] = next.survey.items.slice(2, 4)
    expect(header).toMatchObject({
      type: 'section-header',
      title: 'Locked（コピー）',
    })
    expect(header).not.toHaveProperty('locked')
    expect(header?.id).toMatch(/^sec_new/)
    expect(question).toMatchObject({ label: 'In locked' })
    expect(question?.id).toMatch(/^q_new/)
  })

  it('removes a question, or a section with its questions, within the lock rules', () => {
    expect(idsOf(run(start(), { type: 'remove', id: 'q_open' }))).not.toContain(
      'q_open'
    )
    expect(idsOf(run(start(), { type: 'remove', id: 'sec_last' }))).toEqual([
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_open',
      'q_locked',
    ])
    const state = start()
    expect(run(state, { type: 'remove', id: 'sec_open' })).toBe(state)
    expect(run(state, { type: 'remove', id: 'q_locked' })).toBe(state)
    expect(run(state, { type: 'remove', id: 'sec_locked' })).toBe(state)
  })

  it('clears the selection when the selected item is removed', () => {
    expect(
      run(start('q_last'), { type: 'remove', id: 'sec_last' }).selectedId
    ).toBeNull()
  })

  it('merges a section into the one above, except into or from a locked one', () => {
    expect(
      idsOf(run(start(), { type: 'mergeSection', id: 'sec_last' }))
    ).toEqual([
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_open',
      'q_locked',
      'q_last',
    ])
    const state = start()
    expect(run(state, { type: 'mergeSection', id: 'sec_open' })).toBe(state)
  })

  it('moves a question over another, never into or out of a locked section', () => {
    expect(
      idsOf(run(start(), { type: 'move', id: 'q_open', overId: 'q_last' }))
    ).toEqual([
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_locked',
      'sec_last',
      'q_last',
      'q_open',
    ])
    const state = start()
    expect(
      run(state, { type: 'move', id: 'q_open', overId: 'q_in_locked' })
    ).toBe(state)
    expect(
      run(state, { type: 'move', id: 'q_in_locked', overId: 'q_open' })
    ).toBe(state)
    expect(run(state, { type: 'move', id: 'q_locked', overId: 'q_open' })).toBe(
      state
    )
  })

  it('reorders sections with their questions and keeps leading questions first', () => {
    const next = run(start(), {
      type: 'reorderSections',
      order: ['sec_last', 'sec_locked', 'sec_open'],
    })
    expect(idsOf(next)).toEqual([
      'sec_last',
      'q_last',
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_open',
      'q_locked',
    ])
    const leading: CreatorState = {
      survey: {
        title: 'T',
        items: [
          { id: 'q_lead', type: 'short-text', label: 'Lead' },
          { id: 's1', type: 'section-header', title: '1' },
          { id: 's2', type: 'section-header', title: '2' },
        ],
      },
      selectedId: null,
      dirty: false,
    }
    expect(
      idsOf(run(leading, { type: 'reorderSections', order: ['s2', 's1'] }))
    ).toEqual(['q_lead', 's2', 's1'])
    expect(run(leading, { type: 'reorderSections', order: ['s2'] })).toBe(
      leading
    )
  })

  it('resets to a new survey and clears dirty', () => {
    const dirty = run(start(), { type: 'updateSurvey', title: 'x' })
    const next = run(dirty, {
      type: 'reset',
      survey: LOCKS,
      selectedId: 'q_open',
    })
    expect(next).toEqual({ survey: LOCKS, selectedId: 'q_open', dirty: false })
  })
})
