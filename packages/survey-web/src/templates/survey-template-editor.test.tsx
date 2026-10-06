import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { classesOf, v0t } from '../../test/v0-template-classes'
import type { SurveyInput } from '../schema/survey-schema'
import {
  SurveyTemplateEditor,
  type SurveyTemplateEditorProps,
} from './survey-template-editor'

const stored: SurveyInput = {
  title: '満足度調査',
  items: [
    { id: 'sec_1', type: 'section-header', title: 'S' },
    { id: 'q_1', type: 'short-text', label: 'Q' },
  ],
}

const editor = (props: Partial<SurveyTemplateEditorProps> = {}) =>
  render(
    <SurveyTemplateEditor
      mode="edit"
      defaultValue={stored}
      onSave={() => {}}
      onCancel={() => {}}
      onDelete={() => {}}
      {...props}
    />
  )

const titleInput = async () => {
  await userEvent.click(screen.getByRole('button', { name: '満足度調査' }))
  return screen.getByPlaceholderText('アンケートのタイトル')
}

describe('SurveyTemplateEditor', () => {
  it('shows v0’s loading texts', () => {
    const { unmount } = editor({ loading: true })
    expect(
      screen.getByText('アンケートを読み込んでいます...')
    ).toBeInTheDocument()
    unmount()
    editor({ loading: true, mode: 'create' })
    expect(
      screen.getByText('アンケート作成インターフェースを準備しています...')
    ).toBeInTheDocument()
  })

  it('shows the error with a retry', async () => {
    const onRetry = vi.fn()
    editor({ error: new Error('通信エラー'), onRetry })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'アンケートの読み込みに失敗しました。'
    )
    expect(screen.getByRole('alert')).toHaveTextContent('通信エラー')
    await userEvent.click(screen.getByRole('button', { name: '再度試す' }))
    expect(onRetry).toHaveBeenCalled()
  })

  it('enables Update only while the survey differs from what was loaded (v0)', async () => {
    editor()
    const update = screen.getByRole('button', { name: '更新' })
    expect(classesOf(update.parentElement)).toEqual(v0t('actions.bar'))
    expect(classesOf(update)).toEqual(
      expect.arrayContaining(v0t('actions.button'))
    )
    expect(update).toBeDisabled()
    const title = await titleInput()
    await userEvent.type(title, '!')
    expect(update).toBeEnabled()
    await userEvent.type(title, '{Backspace}')
    expect(update).toBeDisabled()
  })

  it('saves the parsed survey', async () => {
    const onSave = vi.fn()
    editor({ onSave })
    await userEvent.type(await titleInput(), '2')
    await userEvent.click(screen.getByRole('button', { name: '更新' }))
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ title: '満足度調査2' })
    )
  })

  it('creates without a delete button', () => {
    editor({ mode: 'create', defaultValue: undefined })
    expect(screen.getByRole('button', { name: '作成' })).toBeEnabled()
    expect(screen.queryByRole('button', { name: '削除' })).toBeNull()
  })

  it('goes back at once without changes, and asks first with changes', async () => {
    const onCancel = vi.fn()
    editor({ onCancel })
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    expect(onCancel).toHaveBeenCalledTimes(1)

    await userEvent.type(await titleInput(), '!')
    await userEvent.click(screen.getByRole('button', { name: '戻る' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: '変更を破棄しますか？',
    })
    await userEvent.click(within(dialog).getByRole('button', { name: 'OK' }))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('deletes after confirming', async () => {
    const onDelete = vi.fn()
    editor({ onDelete })
    await userEvent.click(screen.getByRole('button', { name: '削除' }))
    const dialog = await screen.findByRole('alertdialog', {
      name: '削除の確認',
    })
    await userEvent.click(
      within(dialog).getByRole('button', { name: '削除する' })
    )
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('locks everything while saving', () => {
    editor({ saving: true })
    expect(screen.getByRole('button', { name: '戻る' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '削除' })).toBeDisabled()
    expect(screen.getByRole('tab', { name: 'プレビュー' })).toBeDisabled()
  })
})
