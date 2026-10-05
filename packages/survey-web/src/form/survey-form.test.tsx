import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { BRANCHING, SAVED_VALUES } from '../../test/fixtures/form-surveys'
import { V0 } from '../../test/v0-classes'
import type { QuestionRendererProps } from '../question-types/types'
import type { SurveyInput } from '../schema/survey-schema'
import { SurveyForm } from './survey-form'

function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function classesOf(element: Element | null): string[] {
  return (element?.getAttribute('class') ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .map((name) => name.replace(/^mbc:/, ''))
    .sort()
}

const v0 = (key: keyof typeof V0) => V0[key].split(' ').sort()

describe('SurveyForm', () => {
  it('keeps v0’s layout classes', () => {
    render(<SurveyForm schema={BRANCHING} onSubmit={() => {}} />)
    const title = screen.getByRole('heading', { level: 1 })
    expect(classesOf(screen.getByRole('form'))).toEqual(v0('form.root'))
    expect(classesOf(title.parentElement)).toEqual(v0('form.header'))
    expect(classesOf(title)).toEqual(v0('form.title'))
    expect(classesOf(screen.getByText('ご協力ください'))).toEqual(
      v0('form.description')
    )
    expect(classesOf(screen.getByRole('heading', { level: 2 }))).toEqual(
      v0('form.section-title')
    )
    expect(
      classesOf(screen.getByRole('button', { name: '次へ' }).parentElement)
    ).toEqual(v0('form.actions'))
  })

  it('shows the survey and its first section', () => {
    render(<SurveyForm schema={BRANCHING} onSubmit={() => {}} />)
    expect(
      screen.getByRole('heading', { level: 1, name: '通勤アンケート' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'はじめに' })
    ).toBeInTheDocument()
    expect(screen.getByRole('form')).toHaveAttribute('data-mbc', '')
  })

  it('keeps the section, shows the error and focuses the field on an invalid Next', async () => {
    render(<SurveyForm schema={BRANCHING} onSubmit={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: '次へ' }))

    const name = screen.getByRole('textbox', { name: /お名前/ })
    expect(
      screen.getByRole('heading', { level: 2, name: 'はじめに' })
    ).toBeInTheDocument()
    expect(await screen.findAllByText('この質問は必須です')).not.toHaveLength(0)
    await waitFor(() => expect(name).toHaveFocus())
    expect(name).toHaveAccessibleDescription('この質問は必須です')
  })

  it('follows branches, goes back, and clears abandoned answers on submit', async () => {
    const onSubmit = vi.fn()
    const onSectionChange = vi.fn()
    render(
      <SurveyForm
        schema={BRANCHING}
        onSubmit={onSubmit}
        onSectionChange={onSectionChange}
      />
    )

    await userEvent.type(screen.getByRole('textbox', { name: /お名前/ }), 'Ann')
    await userEvent.click(screen.getByRole('radio', { name: '車' }))
    await userEvent.click(screen.getByRole('button', { name: '次へ' }))
    expect(
      await screen.findByRole('heading', { level: 2, name: '車' })
    ).toHaveFocus()
    await userEvent.type(screen.getByRole('textbox', { name: '車種' }), 'Mini')

    await userEvent.click(screen.getByRole('button', { name: '前へ' }))
    expect(screen.getByRole('textbox', { name: /お名前/ })).toHaveValue('Ann')
    await userEvent.click(screen.getByRole('radio', { name: '徒歩' }))
    await userEvent.click(screen.getByRole('button', { name: '次へ' }))
    await userEvent.type(
      await screen.findByRole('textbox', { name: '歩数' }),
      '8000'
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'アンケートを送信' })
    )

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    const [answers, meta] = onSubmit.mock.calls[0] as [
      Record<string, unknown>,
      { id: string; value: unknown }[],
    ]
    expect(answers).toEqual({
      name: 'Ann',
      route: 'walk',
      model: undefined,
      steps: '8000',
      score: undefined,
    })
    expect(meta.map((entry) => entry.id)).toEqual([
      'name',
      'route',
      'model',
      'steps',
      'score',
    ])
    expect(meta.find((entry) => entry.id === 'model')).toMatchObject({
      value: undefined,
    })
    expect(onSectionChange.mock.calls.map(([id]) => id)).toEqual([
      'car',
      'start',
      'walk',
    ])
  })

  it('moves to the next section when Enter is pressed in a field', async () => {
    const onSubmit = vi.fn()
    render(<SurveyForm schema={BRANCHING} onSubmit={onSubmit} />)
    await userEvent.click(screen.getByRole('radio', { name: '車' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: /お名前/ }),
      'Ann{Enter}'
    )

    expect(
      await screen.findByRole('heading', { level: 2, name: '車' })
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows and resubmits v0-shaped saved answers', async () => {
    const onSubmit = vi.fn()
    const saved = {
      when: { hour: '09', minute: '30' },
      how: 'other:自転車',
      stars: 4,
    }
    render(
      <SurveyForm
        schema={SAVED_VALUES}
        defaultValues={saved}
        onSubmit={onSubmit}
      />
    )

    expect(screen.getByDisplayValue('自転車')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '5段階中4' })).toBeChecked()
    await userEvent.click(
      screen.getByRole('button', { name: 'アンケートを送信' })
    )

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual(saved)
  })

  it('waits for an async onSubmit, reports a rejection, and allows a retry', async () => {
    const attempts = [deferred(), deferred()]
    const onSubmit = vi.fn(
      () => attempts[onSubmit.mock.calls.length - 1]!.promise
    )
    const onSubmitError = vi.fn()
    render(
      <SurveyForm
        schema={SAVED_VALUES}
        onSubmit={onSubmit}
        onSubmitError={onSubmitError}
        submitLabel="送る"
      />
    )
    const submit = screen.getByRole('button', { name: '送る' })

    await userEvent.click(submit)
    await waitFor(() => expect(submit).toBeDisabled())
    attempts[0]!.reject(new Error('offline'))
    expect(
      await screen.findByText('送信に失敗しました。もう一度お試しください。')
    ).toBeInTheDocument()
    expect(onSubmitError).toHaveBeenCalledWith(new Error('offline'))
    await waitFor(() => expect(submit).toBeEnabled())

    await userEvent.click(submit)
    attempts[1]!.resolve()
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(2))
  })

  it('fills schema defaults for unparsed backend JSON', () => {
    const stored = {
      title: 'T',
      items: [{ id: 'r', type: 'rating', label: 'R' }],
    }
    render(<SurveyForm schema={stored as SurveyInput} onSubmit={() => {}} />)
    expect(screen.getAllByRole('radio')).toHaveLength(5)
  })

  it('uses a host renderer from components', () => {
    function MyRating({ question }: QuestionRendererProps) {
      return <p>custom {question.id}</p>
    }
    render(
      <SurveyForm
        schema={SAVED_VALUES}
        onSubmit={() => {}}
        components={{ rating: MyRating }}
      />
    )
    expect(screen.getByText('custom stars')).toBeInTheDocument()
  })

  it('translates its buttons and shows the empty state', () => {
    render(
      <MbcProvider locale="en">
        <SurveyForm
          schema={{ title: 'Empty', items: [] }}
          onSubmit={() => {}}
        />
      </MbcProvider>
    )
    expect(screen.getByText('This survey has no content.')).toBeInTheDocument()
  })

  it('disables every control when disabled', () => {
    render(<SurveyForm schema={BRANCHING} onSubmit={() => {}} disabled />)
    expect(screen.getByRole('textbox', { name: /お名前/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled()
  })
})
