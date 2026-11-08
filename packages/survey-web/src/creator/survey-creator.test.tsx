import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { LOCKS } from '../../test/fixtures/creator-surveys'
import { classesOf, v0c } from '../../test/v0-creator-classes'
import type { SurveyInput } from '../schema/survey-schema'
import { SurveyCreator, type SurveyCreatorHandle } from './survey-creator'

const sectionIds = (handle: SurveyCreatorHandle) =>
  handle
    .getValue()
    .items.filter((item) => item.type === 'section-header')
    .map((item) => item.id)

function stackRects(selector: string) {
  const rows = () => [...document.querySelectorAll<HTMLElement>(selector)]
  for (const row of rows()) {
    row.getBoundingClientRect = () => {
      const top = rows().indexOf(row) * 120
      return {
        x: 0,
        y: top,
        top,
        left: 0,
        bottom: top + 100,
        right: 600,
        width: 600,
        height: 100,
        toJSON: () => ({}),
      } as DOMRect
    }
  }
}

describe('SurveyCreator', () => {
  it('starts a new survey like v0: title selected, one section, the add bar', async () => {
    render(<SurveyCreator />)
    expect(screen.getByRole('tab', { name: '作成者' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    const title = screen.getByPlaceholderText('アンケートのタイトル')
    expect(title).toHaveValue('未タイトル調査')
    expect(classesOf(title.closest('[class*="border-l-8"]'))).toEqual(
      v0c('title.selected')
    )
    expect(screen.getByText('セクション 1 / 1')).toBeInTheDocument()
    expect(screen.getByText('最初のセクション')).toBeInTheDocument()
    expect(
      await screen.findByRole('toolbar', { name: '項目を追加' })
    ).toBeInTheDocument()
  })

  it('adds a question, focuses its label and reports each change', async () => {
    const onChange = vi.fn()
    render(<SurveyCreator onChange={onChange} />)
    await userEvent.click(
      await screen.findByRole('button', { name: '質問を追加' })
    )
    const label = screen.getByPlaceholderText('質問')
    expect(label).toHaveFocus()
    await userEvent.type(label, 'Q')

    expect(onChange).toHaveBeenCalledTimes(2)
    const [survey, state] = onChange.mock.calls[1]!
    expect(survey.items[1]).toMatchObject({ type: 'short-text', label: 'Q' })
    expect(state).toEqual({ isValid: true, isDirty: true })
  })

  it('applies the lock rules from the floating bar (v0)', async () => {
    const ref = createRef<SurveyCreatorHandle>()
    render(<SurveyCreator ref={ref} defaultValue={LOCKS} />)
    // v0 selects the first item of a loaded survey: the locked section.
    const addQuestion = await screen.findByRole('button', {
      name: 'ロックされたセクションには質問を追加できません',
    })
    expect(addQuestion).toBeDisabled()
    await userEvent.click(
      screen.getByRole('button', {
        name: 'ロックされたセクションの後にセクションを追加',
      })
    )
    expect(ref.current!.getValue().items[2]).toMatchObject({
      type: 'section-header',
      title: 'セクション 4',
    })

    await userEvent.click(screen.getByRole('button', { name: 'In locked' }))
    expect(
      screen.getByRole('button', {
        name: 'ロックされたセクションには質問を追加できません',
      })
    ).toBeDisabled()
  })

  it('moves a question from the keyboard with translated announcements', async () => {
    const ref = createRef<SurveyCreatorHandle>()
    render(<SurveyCreator ref={ref} defaultValue={LOCKS} />)
    stackRects('[data-sortable-question]')
    const [handle] = screen.getAllByRole('button', {
      name: 'ドラッグして並べ替え',
    })
    expect(handle).toHaveAttribute('aria-roledescription', '並べ替え可能')
    handle!.focus()
    // dnd-kit replaces the pick-up text at once with the first "moved over" text.
    await userEvent.keyboard(' ')
    // Past the locked question (a valid target: its section is open) to "Pick".
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowDown}')
    expect(
      await screen.findByText(
        '「Open question」を「Pick」の位置に移動しました。'
      )
    ).toBeInTheDocument()
    await userEvent.keyboard(' ')

    expect(ref.current!.getValue().items.map((item) => item.id)).toEqual([
      'sec_locked',
      'q_in_locked',
      'sec_open',
      'q_locked',
      'sec_last',
      'q_last',
      'q_open',
    ])
    expect(
      await screen.findByText('「Open question」を「Pick」の位置に置きました。')
    ).toBeInTheDocument()
  })

  it('never offers a question inside a locked section as a drop target', async () => {
    render(<SurveyCreator defaultValue={LOCKS} />)
    stackRects('[data-sortable-question]')
    const [handle] = screen.getAllByRole('button', {
      name: 'ドラッグして並べ替え',
    })
    handle!.focus()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{ArrowUp}')
    const live = () => document.querySelector('[aria-live]')?.textContent ?? ''
    await waitFor(() => expect(live()).not.toBe(''))
    expect(live()).not.toContain('In locked')
    await userEvent.keyboard('{Escape}')
  })

  it('submits only a valid survey and shows card errors otherwise', async () => {
    const onSubmit = vi.fn()
    const ref = createRef<SurveyCreatorHandle>()
    const broken = {
      title: 'T',
      items: [{ id: 'sec_1', type: 'section-header', title: '' }],
    }
    render(
      <SurveyCreator
        ref={ref}
        defaultValue={broken as SurveyInput}
        onSubmit={onSubmit}
      />
    )

    let ok: boolean | undefined
    await act(async () => {
      ok = await ref.current!.submit()
    })
    expect(ok).toBe(false)
    expect(onSubmit).not.toHaveBeenCalled()
    expect(
      screen.getByText('セクションのタイトルを入力してください')
    ).toBeInTheDocument()
    const sectionTitle = screen.getByPlaceholderText('未タイトルセクション')
    await waitFor(() => expect(sectionTitle).toHaveFocus())
    expect(sectionTitle).toHaveAttribute('aria-invalid', 'true')
    expect(sectionTitle).toHaveAccessibleDescription(
      'セクションのタイトルを入力してください'
    )

    await userEvent.type(
      screen.getByPlaceholderText('未タイトルセクション'),
      'S'
    )
    await act(async () => {
      ok = await ref.current!.submit()
    })
    expect(ok).toBe(true)
    expect(onSubmit).toHaveBeenCalledWith({
      title: 'T',
      items: [{ id: 'sec_1', type: 'section-header', title: 'S' }],
    })
  })

  it('opens backend JSON without defaults and saves it schema-valid', async () => {
    const onSubmit = vi.fn()
    const ref = createRef<SurveyCreatorHandle>()
    const stored = {
      title: 'T',
      items: [
        { id: 'sec_1', type: 'section-header', title: 'S' },
        { id: 'q_r', type: 'rating', label: 'R', extra: 1 },
      ],
    }
    render(
      <SurveyCreator
        ref={ref}
        defaultValue={stored as SurveyInput}
        onSubmit={onSubmit}
      />
    )
    await act(async () => {
      await ref.current!.submit()
    })
    expect(onSubmit.mock.calls[0]?.[0].items[1]).toEqual({
      id: 'q_r',
      type: 'rating',
      label: 'R',
      levels: 5,
      symbol: 'star',
    })
  })

  it('resets to another survey without calling onChange', async () => {
    const onChange = vi.fn()
    const ref = createRef<SurveyCreatorHandle>()
    render(<SurveyCreator ref={ref} onChange={onChange} />)
    act(() => ref.current!.reset(LOCKS))
    expect(sectionIds(ref.current!)).toEqual([
      'sec_locked',
      'sec_open',
      'sec_last',
    ])
    expect(screen.getByText('セクション 3 / 3')).toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('reorders sections through the dialog', async () => {
    const ref = createRef<SurveyCreatorHandle>()
    render(<SurveyCreator ref={ref} defaultValue={LOCKS} />)
    const [, openMenu] = screen.getAllByRole('button', {
      name: 'セクションのオプション',
    })
    await userEvent.click(openMenu!)
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'セクションを移動' })
    )
    const dialog = await screen.findByRole('dialog', {
      name: 'セクションを移動',
    })
    await userEvent.click(within(dialog).getByRole('button', { name: '保存' }))
    expect(sectionIds(ref.current!)).toEqual([
      'sec_locked',
      'sec_open',
      'sec_last',
    ])
  })

  it('previews the current survey and notes a preview submit', async () => {
    render(
      <SurveyCreator
        defaultValue={{
          title: 'Preview me',
          items: [
            { id: 's', type: 'section-header', title: 'S' },
            { id: 'q', type: 'short-text', label: 'Q' },
          ],
        }}
      />
    )
    await userEvent.click(screen.getByRole('tab', { name: 'プレビュー' }))
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Preview me' })
    ).toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'アンケートを送信' })
    )
    expect(
      await screen.findByText('プレビューが送信されました。')
    ).toBeInTheDocument()
  })

  it('keeps the tabs in view while the questions scroll, below an app header', () => {
    render(<SurveyCreator />)
    const bar = screen.getByRole('tablist').parentElement!
    expect(classesOf(bar)).toEqual(
      expect.arrayContaining([
        'sticky',
        'top-[var(--mbc-creator-sticky-top,0px)]',
        // Above section badges (z-10) and the lg floating bar (z-20).
        'z-30',
        'bg-background',
      ])
    )
    // The list grows to its triggers, so the background covers the whole bar.
    expect(classesOf(screen.getByRole('tablist'))).toContain('h-auto')
    expect(classesOf(screen.getByRole('tablist'))).not.toContain('h-9')
  })

  it('keeps scrolled-to cards clear of the pinned tabs', () => {
    render(
      <SurveyCreator
        defaultValue={{
          title: 'T',
          items: [
            { id: 's', type: 'section-header', title: 'S' },
            { id: 'q', type: 'short-text', label: 'Q' },
          ],
        }}
      />
    )
    const cards = document.querySelectorAll('[data-creator-card]')
    // The title, the section and the question.
    expect(cards).toHaveLength(3)
    const list = cards[0]!.closest('[class*="data-creator-card"]')
    expect(classesOf(list)).toContain(
      '[&_[data-creator-card]]:scroll-mt-[calc(var(--mbc-creator-sticky-top,0px)+5.5rem)]'
    )
  })

  it('returns to the selected question after the preview', async () => {
    const scrolled: Element[] = []
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = function (this: Element) {
      scrolled.push(this)
    }
    try {
      render(
        <SurveyCreator
          defaultValue={{
            title: 'T',
            items: [
              { id: 's', type: 'section-header', title: 'S' },
              { id: 'q1', type: 'short-text', label: 'First' },
              { id: 'q2', type: 'short-text', label: 'Last' },
            ],
          }}
        />
      )
      await userEvent.click(screen.getByText('Last'))
      await userEvent.click(screen.getByRole('tab', { name: 'プレビュー' }))
      scrolled.length = 0
      await userEvent.click(screen.getByRole('tab', { name: '作成者' }))
      await waitFor(() => expect(scrolled).toHaveLength(1))
      expect(
        within(scrolled[0] as HTMLElement).getByDisplayValue('Last')
      ).toBeInTheDocument()
      expect(scrolled[0]).toHaveAttribute('data-creator-card')
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('shows live JSON', async () => {
    render(<SurveyCreator defaultValue={LOCKS} />)
    await userEvent.click(screen.getByRole('tab', { name: 'JSON' }))
    expect(await screen.findByText(/"title": "Locks"/)).toBeInTheDocument()
  })

  it('disables every control when disabled', async () => {
    render(<SurveyCreator defaultValue={LOCKS} disabled />)
    expect(screen.getByRole('tab', { name: 'プレビュー' })).toBeDisabled()
    await waitFor(() =>
      expect(
        screen.getByRole('button', {
          name: 'ロックされたセクションの後にセクションを追加',
        })
      ).toBeDisabled()
    )
  })

  it('speaks English', () => {
    render(
      <MbcProvider locale="en">
        <SurveyCreator />
      </MbcProvider>
    )
    expect(screen.getByRole('tab', { name: 'Creator' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Survey title')).toHaveValue(
      'Untitled survey'
    )
  })

  it('keeps keyboard focus on a card after merge, collapse and the reorder dialog', async () => {
    render(<SurveyCreator defaultValue={LOCKS} />)
    // Merge the last section: focus lands on the item before it.
    await userEvent.click(
      screen.getAllByRole('button', { name: 'セクションのオプション' })[2]!
    )
    await userEvent.click(
      await screen.findByRole('menuitem', { name: '上のセクションとマージ' })
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Locked question' })
      )
    )

    // Collapse an open section: focus returns to its title button.
    await userEvent.click(screen.getByRole('button', { name: 'Open' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'セクションを閉じる' })
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Open' })
      )
    )

    // The reorder dialog gives focus back to the section that opened it.
    await userEvent.click(
      screen.getAllByRole('button', { name: 'セクションのオプション' })[1]!
    )
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'セクションを移動' })
    )
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'キャンセル',
      })
    )
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole('button', { name: 'Open' })
      )
    )
  })

  it('focuses the copy after duplicating and the neighbour after deleting', async () => {
    const ref = createRef<SurveyCreatorHandle>()
    render(<SurveyCreator ref={ref} defaultValue={LOCKS} />)
    await userEvent.click(screen.getByRole('button', { name: 'Open question' }))
    await userEvent.click(screen.getByRole('button', { name: '複製' }))
    const label = () => screen.getByPlaceholderText('質問')
    await waitFor(() => expect(label()).toHaveFocus())
    expect(label()).toHaveValue('Open question')
    expect(ref.current!.getValue().items.map((item) => item.id)[4]).not.toBe(
      'q_open'
    )

    await userEvent.click(screen.getByRole('button', { name: '削除' }))
    // The neighbour (the original question) is selected and open for editing.
    await waitFor(() => expect(label()).toHaveFocus())
    expect(label()).toHaveValue('Open question')
  })
})
