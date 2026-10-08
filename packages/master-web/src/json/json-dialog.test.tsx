import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { JsonDialog, type JsonDialogProps } from './json-dialog'

afterEach(() => vi.restoreAllMocks())

function setup(overrides: Partial<JsonDialogProps> = {}) {
  const onApply = vi.fn<JsonDialogProps['onApply']>(() => undefined)
  render(
    <JsonDialog
      text={() => '{"code":"P"}'}
      fileName="master-setting.json"
      onApply={onApply}
      {...overrides}
    />
  )
  return { onApply }
}

const open = () =>
  userEvent.click(screen.getByRole('button', { name: 'JSONエディタ' }))
const editor = () => screen.getByRole('textbox', { name: 'JSON' })

describe('JsonDialog', () => {
  it('opens with the current text, read when it opens', async () => {
    let current = '{"code":"A"}'
    setup({ text: () => current })
    current = '{"code":"B"}'
    await open()
    expect(screen.getByRole('dialog', { name: 'JSONエディタ' })).toBeVisible()
    expect(editor()).toHaveValue('{"code":"B"}')
  })

  it('applies the edited text and closes', async () => {
    const { onApply } = setup()
    await open()
    await userEvent.clear(editor())
    await userEvent.type(editor(), '{{}')
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(onApply).toHaveBeenCalledWith('{}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('stays open and shows why when the text is refused', async () => {
    setup({ onApply: () => 'JSON が無効です。' })
    await open()
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(screen.getByRole('alert')).toHaveTextContent('JSON が無効です。')
    expect(editor()).toHaveAttribute('aria-invalid', 'true')
    // Reopening starts clean.
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    await open()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('loads a JSON file and saves the text under its file name', async () => {
    setup()
    await open()
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    await userEvent.upload(
      input,
      new File(['{"code":"F"}'], 'x.json', { type: 'application/json' })
    )
    await waitFor(() => expect(editor()).toHaveValue('{"code":"F"}'))

    const created: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      created.push(blob as Blob)
      return 'blob:x'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('master-setting.json')
      })
    await userEvent.click(screen.getByRole('button', { name: 'JSON保存' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(await created[0]?.text()).toBe('{"code":"F"}')
  })

  it('has no axe violations while open', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <JsonDialog
            text={() => '{}'}
            fileName="x.json"
            onApply={() => undefined}
          />
        </main>
      </MbcProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'JSON editor' }))
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})
