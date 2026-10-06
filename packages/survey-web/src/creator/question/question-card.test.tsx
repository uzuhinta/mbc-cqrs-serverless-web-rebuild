import type { DraggableAttributes } from '@dnd-kit/core'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { itemById, renderCreator } from '../../../test/creator-harness'
import { LOCKS } from '../../../test/fixtures/creator-surveys'
import { classesOf, v0c } from '../../../test/v0-creator-classes'
import type { Survey } from '../../schema/survey-schema'
import { QuestionCard, type DragHandleProps } from './question-card'

const handle: DragHandleProps = {
  attributes: { role: 'button', tabIndex: 0 } as DraggableAttributes,
  listeners: undefined,
  setActivatorNodeRef: () => {},
}
const card = (id: string) => <QuestionCard id={id} handle={handle} />

describe('QuestionCard', () => {
  it('shows v0’s view mode until selected', async () => {
    const { store, container } = renderCreator(card('q_open'))
    const root = container.firstElementChild
    expect(classesOf(root)).toEqual(v0c('question.idle'))
    // v0's bg-white needs a dark variant; the library sets no text colour.
    expect(classesOf(root)).toContain('dark:bg-card')
    expect(classesOf(root?.firstElementChild ?? null)).toEqual(
      v0c('question.view')
    )
    expect(screen.getByText('短文回答')).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).toBeNull()

    await userEvent.click(screen.getByText('短文回答'))
    expect(store.getState().selectedId).toBe('q_open')
    expect(classesOf(container.firstElementChild)).toEqual(
      v0c('question.selected')
    )
    // Input's own base classes come first (as in v0); v0's additions must all be there.
    expect(classesOf(screen.getByPlaceholderText('質問'))).toEqual(
      expect.arrayContaining(v0c('question.label-input'))
    )
  })

  it('selects from the keyboard and moves focus to the label input', async () => {
    renderCreator(card('q_open'))
    screen.getByRole('button', { name: 'Open question' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByPlaceholderText('質問')).toHaveFocus()
  })

  it('edits the label without touching the id (v0)', async () => {
    const { store } = renderCreator(card('q_open'), { selectedId: 'q_open' })
    const label = screen.getByPlaceholderText('質問')
    await userEvent.clear(label)
    await userEvent.type(label, '年齢')
    expect(itemById(store, 'q_open')).toMatchObject({
      id: 'q_open',
      label: '年齢',
    })
  })

  it('changes the type and toggles required', async () => {
    const { store } = renderCreator(card('q_open'), { selectedId: 'q_open' })
    await userEvent.click(screen.getByRole('combobox', { name: '質問の種類' }))
    await userEvent.click(
      await screen.findByRole('option', { name: 'プルダウン' })
    )
    expect(itemById(store, 'q_open')).toMatchObject({
      type: 'dropdown',
      options: [{ value: '1', label: 'オプション 1' }],
    })
    await userEvent.click(screen.getByRole('switch', { name: '必須' }))
    expect(itemById(store, 'q_open')).toMatchObject({
      validation: { required: true },
    })
  })

  it('shows and clears the description, and turns on v0’s default rule', async () => {
    const { store } = renderCreator(card('q_open'), { selectedId: 'q_open' })
    await userEvent.click(
      screen.getByRole('button', { name: 'その他のオプション' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', { name: '説明' })
    )
    await userEvent.type(screen.getByPlaceholderText('説明'), 'メモ')
    expect(itemById(store, 'q_open')).toMatchObject({ description: 'メモ' })

    await userEvent.click(
      screen.getByRole('button', { name: 'その他のオプション' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', { name: '回答の検証' })
    )
    expect(itemById(store, 'q_open')).toMatchObject({
      validation: { custom: { type: 'number', rule: 'eq' } },
    })

    await userEvent.click(
      screen.getByRole('button', { name: 'その他のオプション' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', { name: '説明' })
    )
    expect(itemById(store, 'q_open')).not.toHaveProperty('description')
  })

  it('turning branching off clears every option’s target', async () => {
    const { store } = renderCreator(card('q_last'), { selectedId: 'q_last' })
    expect(
      screen.getByRole('combobox', { name: 'セクションに移動...' })
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'その他のオプション' })
    )
    await userEvent.click(
      await screen.findByRole('menuitemcheckbox', {
        name: '回答に基づいてセクションに移動',
      })
    )
    expect(itemById(store, 'q_last')).toMatchObject({
      options: [{ value: 'A', label: 'A' }],
    })
    expect(
      screen.queryByRole('combobox', { name: 'セクションに移動...' })
    ).toBeNull()
  })

  it('duplicates and deletes, but adds nothing into a locked section', async () => {
    const { store } = renderCreator(card('q_open'), { selectedId: 'q_open' })
    await userEvent.click(screen.getByRole('button', { name: '複製' }))
    expect(store.getState().survey.items).toHaveLength(8)
    act(() => store.dispatch({ type: 'select', id: 'q_open' }))
    await userEvent.click(screen.getByRole('button', { name: '削除' }))
    expect(itemById(store, 'q_open')).toBeUndefined()
  })

  it('disables duplicate for an unlocked question inside a locked section', () => {
    renderCreator(card('q_in_locked'), { selectedId: 'q_in_locked' })
    expect(screen.getByRole('button', { name: '複製' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '削除' })).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'ドラッグして並べ替え' })
    ).toBeNull()
  })

  it('keeps a selected locked question read-only, with no delete, duplicate or drag (v0)', () => {
    renderCreator(card('q_locked'), { selectedId: 'q_locked' })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
    expect(screen.queryByRole('button', { name: '複製' })).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'ドラッグして並べ替え' })
    ).toBeNull()
    expect(
      screen.getByRole('img', { name: 'ロックされた質問' })
    ).toBeInTheDocument()
  })

  it('shows a drag handle for a draggable question', () => {
    renderCreator(card('q_open'))
    expect(
      screen.getByRole('button', { name: 'ドラッグして並べ替え' })
    ).toBeInTheDocument()
  })

  it('shows errors after a submit attempt and warnings at once', () => {
    const survey: Survey = {
      ...LOCKS,
      items: [
        ...LOCKS.items.slice(0, 6),
        {
          id: 'q_last',
          type: 'single-choice',
          label: 'Pick',
          options: [{ value: 'A', label: 'A', nextSectionId: 'sec_gone' }],
        },
        { id: 'q_empty', type: 'dropdown', label: 'Empty', options: [] },
      ],
    }
    const first = renderCreator(
      <>
        {card('q_last')}
        {card('q_empty')}
      </>,
      { survey }
    )
    expect(
      screen.getByText('移動先のセクションが見つかりません')
    ).toBeInTheDocument()
    expect(screen.queryByText('オプションを1つ以上追加してください')).toBeNull()
    first.unmount()

    renderCreator(card('q_empty'), { survey, showErrors: true })
    expect(
      screen.getByText('オプションを1つ以上追加してください')
    ).toBeInTheDocument()
  })

  it('does not re-render when another card changes', () => {
    const renders = vi.fn()
    const { store } = renderCreator(
      <>
        <QuestionCard id="q_open" />
        <QuestionCard id="q_last" />
      </>
    )
    const before = document.body.innerHTML
    act(() =>
      store.dispatch({
        type: 'updateItem',
        id: 'q_open',
        update: (item) =>
          item.type === 'section-header' ? item : { ...item, label: 'Renamed' },
      })
    )
    renders()
    expect(document.body.innerHTML).not.toBe(before)
    expect(screen.getByText('Pick')).toBeInTheDocument()
  })

  it('marks the clashing option value and explains it on the card', () => {
    const survey: Survey = {
      ...LOCKS,
      items: [
        ...LOCKS.items,
        {
          id: 'q_dup',
          type: 'single-choice',
          label: 'Dup',
          options: [
            { value: '1', label: 'A' },
            { value: '1', label: 'B' },
          ],
        },
      ],
    }
    renderCreator(card('q_dup'), {
      survey,
      selectedId: 'q_dup',
      showErrors: true,
    })
    const values = screen.getAllByRole('textbox', { name: '値' })
    expect(values[0]).not.toHaveAttribute('aria-invalid', 'true')
    expect(values[1]).toHaveAttribute('aria-invalid', 'true')
    expect(
      screen.getByText(
        'オプションの値が重複しているか、予約された値（other）です'
      )
    ).toBeInTheDocument()
  })

  it('links the main field to the card’s errors', async () => {
    const survey: Survey = {
      ...LOCKS,
      items: [
        ...LOCKS.items,
        { id: 'q_empty', type: 'dropdown', label: 'Empty', options: [] },
      ],
    }
    renderCreator(card('q_empty'), {
      survey,
      selectedId: 'q_empty',
      showErrors: true,
    })
    const label = screen.getByPlaceholderText('質問')
    expect(label).toHaveAttribute('aria-invalid', 'true')
    expect(label).toHaveAccessibleDescription(
      'オプションを1つ以上追加してください'
    )
  })
})
