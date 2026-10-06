import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import type {
  LinearScaleQuestion,
  LongTextQuestion,
  MultipleChoiceQuestion,
  RatingQuestion,
  ShortTextQuestion,
  SingleChoiceQuestion,
  SurveyQuestion,
} from '../../schema/survey-schema'
import { ChoiceCountEditor } from './choice-validation'
import { OptionsEditor } from './options-editor'
import { LinearScaleEditor, RatingEditor } from './scale-editors'
import { LongTextEditor, ShortTextEditor } from './text-validation'

/** Renders an editor with real state and prints the question as JSON. */
function Harness<Q extends SurveyQuestion>({
  initial,
  editor,
}: {
  initial: Q
  editor: (question: Q, onChange: (next: Q) => void) => ReactElement
}) {
  const [question, setQuestion] = useState(initial)
  return (
    <>
      {editor(question, setQuestion)}
      <output>{JSON.stringify(question)}</output>
    </>
  )
}
// dnd-kit adds its own role="status" live region, so read the <output> directly.
const stored = () =>
  JSON.parse(document.querySelector('output')?.textContent ?? '{}')

describe('text editors', () => {
  it('builds a number rule with two bounds, then removes it', async () => {
    const initial: ShortTextQuestion = {
      id: 'q',
      type: 'short-text',
      label: 'Q',
      validation: { required: false, custom: { type: 'number', rule: 'eq' } },
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <ShortTextEditor question={q} onChange={set} />}
      />
    )
    expect(screen.getByText('短文回答')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('combobox', { name: 'ルール...' }))
    await userEvent.click(await screen.findByRole('option', { name: '範囲内' }))
    await userEvent.type(screen.getByPlaceholderText('値'), '1')
    await userEvent.type(screen.getByPlaceholderText('かつ'), '9')
    await userEvent.type(
      screen.getByPlaceholderText('カスタムエラーテキスト'),
      'NG'
    )
    expect(stored().validation.custom).toEqual({
      type: 'number',
      rule: 'between',
      value: 1,
      value2: 9,
      customError: 'NG',
    })

    await userEvent.click(
      screen.getByRole('button', { name: '回答の検証を閉じる' })
    )
    expect(stored().validation).toEqual({ required: false })
  })

  it('switching the rule type resets the rule and the value (v0)', async () => {
    const initial: ShortTextQuestion = {
      id: 'q',
      type: 'short-text',
      label: 'Q',
      validation: { custom: { type: 'number', rule: 'gt', value: 3 } },
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <ShortTextEditor question={q} onChange={set} />}
      />
    )
    await userEvent.click(screen.getByRole('combobox', { name: 'タイプ...' }))
    await userEvent.click(
      await screen.findByRole('option', { name: 'テキスト' })
    )
    expect(stored().validation.custom).toEqual({
      type: 'text',
      rule: 'contains',
    })
    await userEvent.click(screen.getByRole('combobox', { name: 'ルール...' }))
    await userEvent.click(
      await screen.findByRole('option', { name: 'メールアドレス' })
    )
    expect(screen.queryByPlaceholderText('値')).toBeNull()
  })

  it('offers only length and regex rules for long text', async () => {
    const initial: LongTextQuestion = {
      id: 'q',
      type: 'long-text',
      label: 'Q',
      validation: { custom: { type: 'length', rule: 'min', value: 0 } },
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <LongTextEditor question={q} onChange={set} />}
      />
    )
    expect(screen.getByText('長文回答 (段落)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('combobox', { name: 'タイプ...' }))
    expect(
      (await screen.findAllByRole('option')).map((o) => o.textContent)
    ).toEqual(['長さ', '正規表現'])
  })

  it('edits the choice-count rule', async () => {
    const initial: MultipleChoiceQuestion = {
      id: 'q',
      type: 'multiple-choice',
      label: 'Q',
      options: [{ value: 'a', label: 'a' }],
      validation: { custom: { rule: 'min', value: 1 } },
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <ChoiceCountEditor question={q} onChange={set} />}
      />
    )
    const count = screen.getByPlaceholderText('数値')
    await userEvent.clear(count)
    await userEvent.type(count, '2')
    expect(stored().validation.custom).toEqual({ rule: 'min', value: 2 })
  })
})

describe('OptionsEditor', () => {
  const single: SingleChoiceQuestion = {
    id: 'q',
    type: 'single-choice',
    label: 'Q',
    options: [{ value: 'オプション 1', label: 'オプション 1' }],
  }
  const sections = [
    { id: 'sec_1', title: 'One' },
    { id: 'sec_2', title: '' },
  ]

  it('mirrors the label into the value, adds options and "Other" (kept last)', async () => {
    render(
      <Harness
        initial={single}
        editor={(q, set) => (
          <OptionsEditor
            question={q}
            onChange={set}
            showBranching={false}
            sections={sections}
          />
        )}
      />
    )
    const first = screen.getByDisplayValue('オプション 1')
    await userEvent.clear(first)
    await userEvent.type(first, '赤')
    await userEvent.click(screen.getByRole('button', { name: 'その他を追加' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'オプションを追加' })
    )

    expect(stored().options).toEqual([
      { value: '赤', label: '赤' },
      { value: 'オプション 2', label: 'オプション 2' },
      { value: 'other', label: 'その他', isOther: true },
    ])
    expect(screen.getByDisplayValue('その他')).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'その他を削除' }))
    expect(stored().options).toHaveLength(2)
  })

  it('removes an option and sets a branch target per option', async () => {
    const two: SingleChoiceQuestion = {
      ...single,
      options: [
        { value: 'a', label: 'a' },
        { value: 'b', label: 'b' },
      ],
    }
    render(
      <Harness
        initial={two}
        editor={(q, set) => (
          <OptionsEditor
            question={q}
            onChange={set}
            showBranching
            sections={sections}
          />
        )}
      />
    )
    const [firstTarget] = screen.getAllByRole('combobox', {
      name: 'セクションに移動...',
    })
    await userEvent.click(firstTarget!)
    await userEvent.click(
      await screen.findByRole('option', { name: '未タイトルセクション' })
    )
    expect(stored().options[0]).toEqual({
      value: 'a',
      label: 'a',
      nextSectionId: 'sec_2',
    })

    await userEvent.click(
      screen.getAllByRole('button', { name: 'オプションを削除' })[1]!
    )
    expect(stored().options).toEqual([
      { value: 'a', label: 'a', nextSectionId: 'sec_2' },
    ])
  })

  it('reorders options from the keyboard', async () => {
    const three: SingleChoiceQuestion = {
      ...single,
      options: ['a', 'b', 'c'].map((v) => ({ value: v, label: v })),
    }
    const { container } = render(
      <Harness
        initial={three}
        editor={(q, set) => (
          <OptionsEditor
            question={q}
            onChange={set}
            showBranching={false}
            sections={sections}
          />
        )}
      />
    )
    stackRects(container, '[data-option-row]')
    const [handleA] = screen.getAllByRole('button', {
      name: 'ドラッグしてオプションを並べ替え',
    })
    handleA!.focus()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{ArrowDown}')
    expect(handleA).toHaveAttribute('aria-roledescription', '並べ替え可能')
    expect(
      screen.getByText('「a」を「b」の位置に移動しました。')
    ).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(stored().options.map((o: { value: string }) => o.value)).toEqual([
      'b',
      'a',
      'c',
    ])
  })

  it('has no "Other" button for dropdowns', () => {
    const dropdown = { ...single, type: 'dropdown' as const }
    render(
      <OptionsEditor
        question={dropdown}
        onChange={() => {}}
        showBranching={false}
        sections={sections}
      />
    )
    expect(screen.queryByRole('button', { name: 'その他を追加' })).toBeNull()
  })
})

describe('scale editors', () => {
  it('sets the linear scale bounds and end labels', async () => {
    const initial: LinearScaleQuestion = {
      id: 'q',
      type: 'linear-scale',
      label: 'Q',
      min: 1,
      max: 5,
    }
    render(
      <Harness
        initial={initial}
        editor={(q, set) => <LinearScaleEditor question={q} onChange={set} />}
      />
    )
    await userEvent.click(screen.getByRole('combobox', { name: '最小値' }))
    await userEvent.click(await screen.findByRole('option', { name: '0' }))
    await userEvent.click(screen.getByRole('combobox', { name: '最大値' }))
    await userEvent.click(await screen.findByRole('option', { name: '10' }))
    const [minLabel] = screen.getAllByPlaceholderText('ラベル（任意)')
    await userEvent.type(minLabel!, '低い')
    expect(stored()).toMatchObject({ min: 0, max: 10, minLabel: '低い' })
  })

  it('sets the rating levels and symbol', async () => {
    const initial: RatingQuestion = {
      id: 'q',
      type: 'rating',
      label: 'Q',
      levels: 5,
      symbol: 'star',
    }
    const { container } = render(
      <Harness
        initial={initial}
        editor={(q, set) => <RatingEditor question={q} onChange={set} />}
      />
    )
    await userEvent.click(screen.getByRole('combobox', { name: '段階数' }))
    await userEvent.click(await screen.findByRole('option', { name: '3' }))
    await userEvent.click(screen.getByRole('combobox', { name: '記号' }))
    await userEvent.click(await screen.findByRole('option', { name: '心' }))
    expect(stored()).toMatchObject({ levels: 3, symbol: 'heart' })
    expect(container.querySelectorAll('svg[class~="mbc:h-6"]')).toHaveLength(3)
  })
})

/**
 * jsdom has no layout: give rows stacked rects (and their list a rect that
 * holds them, for restrictToParentElement) so dnd-kit's keyboard sensor can
 * move between them.
 */
function stackRects(container: HTMLElement, selector: string) {
  const rect = (top: number, height: number) =>
    ({
      x: 0,
      y: top,
      top,
      left: 0,
      bottom: top + height,
      right: 300,
      width: 300,
      height,
      toJSON: () => ({}),
    }) as DOMRect
  const rows = () => [...container.querySelectorAll<HTMLElement>(selector)]
  for (const row of rows()) {
    row.getBoundingClientRect = () => rect(rows().indexOf(row) * 50, 40)
    if (row.parentElement)
      row.parentElement.getBoundingClientRect = () =>
        rect(0, rows().length * 50)
  }
}
