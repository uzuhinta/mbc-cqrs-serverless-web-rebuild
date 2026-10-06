import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { classesOf, v0t } from '../../test/v0-template-classes'
import {
  SurveyTemplateList,
  type SurveyTemplateListProps,
} from './survey-template-list'
import type { SurveyTemplateSummary } from './types'

const items: SurveyTemplateSummary[] = [
  {
    id: 'a',
    name: '満足度調査',
    description: '年次',
    version: 1,
    createdAt: '2026-10-04T03:00:00.000Z',
    questionCount: 5,
    sectionCount: 2,
  },
  { id: 'b', name: '入社アンケート', version: 3 },
]

const list = (props: Partial<SurveyTemplateListProps> = {}) =>
  render(
    <SurveyTemplateList
      items={items}
      total={2}
      page={1}
      pageSize={10}
      keyword=""
      onPageChange={() => {}}
      onKeywordChange={() => {}}
      onSelect={() => {}}
      {...props}
    />
  )

describe('SurveyTemplateList', () => {
  it('shows v0’s header and card grid', () => {
    const { container } = list({ onCreate: () => {} })
    expect(classesOf(container.querySelector('[data-mbc]'))).toEqual(
      expect.arrayContaining(v0t('list.root'))
    )
    expect(
      classesOf(
        screen.getByRole('button', { name: 'アンケートテンプレートを新規作成' })
      )
    ).toEqual(expect.arrayContaining(v0t('create.button')))
    const card = screen.getByRole('button', {
      name: 'アンケートテンプレートを開く: 満足度調査',
    })
    expect(classesOf(card.parentElement)).toEqual(v0t('list.grid'))
    expect(within(card).getByText('5 質問')).toBeInTheDocument()
    expect(within(card).getByText('2 セクション')).toBeInTheDocument()
    expect(within(card).getByText('2026年10月04日')).toBeInTheDocument()
    expect(
      within(
        screen.getByRole('button', {
          name: 'アンケートテンプレートを開く: 入社アンケート',
        })
      ).getByText('説明が提供されていません')
    ).toBeInTheDocument()
  })

  it('selects a card by click or keyboard and creates', async () => {
    const onSelect = vi.fn()
    const onCreate = vi.fn()
    list({ onSelect, onCreate })
    await userEvent.click(screen.getByText('満足度調査'))
    screen
      .getByRole('button', {
        name: 'アンケートテンプレートを開く: 入社アンケート',
      })
      .focus()
    await userEvent.keyboard('{Enter}')
    await userEvent.click(
      screen.getByRole('button', { name: 'アンケートテンプレートを新規作成' })
    )
    expect(onSelect.mock.calls.map(([item]) => item.id)).toEqual(['a', 'b'])
    expect(onCreate).toHaveBeenCalledTimes(1)
  })

  it('shows the loading skeleton instead of cards', () => {
    list({ loading: true })
    expect(
      screen.getByRole('status', {
        name: 'アンケートテンプレートを読み込んでいます',
      })
    ).toBeInTheDocument()
    expect(screen.queryByText('満足度調査')).toBeNull()
  })

  it('shows the error with a retry', async () => {
    const onRetry = vi.fn()
    list({ error: new Error('x'), onRetry })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'アンケートの読み込みに失敗しました。再度試してください。'
    )
    await userEvent.click(screen.getByRole('button', { name: '再度試す' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('shows the empty state', () => {
    list({ items: [], total: 0 })
    expect(
      screen.getByRole('heading', { name: 'アンケートが見つかりません' })
    ).toBeInTheDocument()
  })

  it('pages and searches', async () => {
    const onPageChange = vi.fn()
    const onKeywordChange = vi.fn()
    list({ total: 25, onPageChange, onKeywordChange })
    await userEvent.click(screen.getByRole('link', { name: '2' }))
    await userEvent.type(screen.getByRole('searchbox'), '調査')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(onPageChange).toHaveBeenCalledWith(2)
    expect(onKeywordChange).toHaveBeenCalledWith('調査')
  })

  it('speaks English with English dates (v0’s format)', () => {
    render(
      <MbcProvider locale="en">
        <SurveyTemplateList
          items={items}
          total={2}
          page={1}
          pageSize={10}
          keyword=""
          onPageChange={() => {}}
          onKeywordChange={() => {}}
          onSelect={() => {}}
        />
      </MbcProvider>
    )
    expect(screen.getByText('Oct 04, 2026')).toBeInTheDocument()
    expect(screen.getByText('5 questions')).toBeInTheDocument()
  })
})
