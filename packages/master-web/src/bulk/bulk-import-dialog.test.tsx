import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { BulkJsonItem } from '../core/bulk'
import {
  BulkImportDialog,
  type BulkImportDialogProps,
} from './bulk-import-dialog'

const DATA = {
  settingCode: 'P',
  code: 'D1',
  name: 'データ',
  seq: 0,
  attributes: {},
}

function deferred() {
  let resolve!: () => void
  let reject!: (error: unknown) => void
  const promise = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function setup(overrides: Partial<BulkImportDialogProps> = {}) {
  const onImport = vi.fn<BulkImportDialogProps['onImport']>(async () => {})
  const onImported = vi.fn()
  render(
    <BulkImportDialog
      screen="data"
      settingCode="P"
      onImport={onImport}
      onImported={onImported}
      {...overrides}
    />
  )
  return { onImport, onImported }
}

const open = () =>
  userEvent.click(screen.getByRole('button', { name: 'JSONエディタ' }))
const editor = () => screen.getByRole('textbox', { name: 'JSON' })
const typeJson = async (value: unknown) => {
  await userEvent.clear(editor())
  // userEvent.type treats { and [ as key descriptors; paste the JSON instead.
  editor().focus()
  await userEvent.paste(JSON.stringify(value))
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BulkImportDialog', () => {
  it('opens with the sample for its screen', async () => {
    setup()
    await open()
    expect(
      screen.getByRole('dialog', { name: 'JSONエディタ' })
    ).toBeInTheDocument()
    expect(
      JSON.parse((editor() as HTMLTextAreaElement).value)[0].settingCode
    ).toBe('P')
  })

  it('starts from the host’s sample when given', async () => {
    setup({ inputSampleJson: '[]' })
    await open()
    expect(editor()).toHaveValue('[]')
  })

  it('lists every bad entry and sends nothing', async () => {
    const { onImport } = setup({ tenantCode: 't1' })
    await open()
    await typeJson([{ code: 1 }, { ...DATA, tenantCode: 't2' }])
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(
      screen.getByText(
        '1件目: 各項目には settingCode, code, name, seq, attributes が必須です。'
      )
    ).toBeInTheDocument()
    expect(
      screen.getByText('2件目: tenantCode が現在のテナントと異なります。')
    ).toBeInTheDocument()
    expect(editor()).toHaveAttribute('aria-invalid', 'true')
    expect(onImport).not.toHaveBeenCalled()
  })

  it('imports with progress, then closes and reports success', async () => {
    const gate = deferred()
    let report: (done: number, total: number) => void = () => {}
    const onImport = vi.fn<BulkImportDialogProps['onImport']>(
      async (_items: BulkJsonItem[], onProgress) => {
        report = onProgress
        await gate.promise
      }
    )
    const { onImported } = setup({ onImport })
    await open()
    await typeJson([DATA, { ...DATA, code: 'D2' }])
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    expect(screen.getByRole('status')).toHaveTextContent('反映中 (0/2)')
    report(1, 2)
    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent('反映中 (1/2)')
    )
    expect(screen.getByRole('button', { name: 'キャンセル' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    gate.resolve()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onImport.mock.calls[0]?.[0]).toEqual([DATA, { ...DATA, code: 'D2' }])
    expect(onImported).toHaveBeenCalledTimes(1)
  })

  it('stays open and says why when the import fails', async () => {
    const { onImported } = setup({
      onImport: async () => {
        throw new Error('batch 2 failed')
      },
    })
    await open()
    await typeJson([DATA])
    await userEvent.click(screen.getByRole('button', { name: 'データ反映' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('マスターデータの反映に失敗しました。')
    expect(alert).toHaveTextContent('batch 2 failed')
    expect(screen.getByRole('button', { name: 'データ反映' })).toBeEnabled()
    expect(onImported).not.toHaveBeenCalled()
  })

  it('loads a JSON file and saves the text as a file', async () => {
    setup()
    await open()
    const input =
      document.querySelector<HTMLInputElement>('input[type="file"]')!
    await userEvent.upload(
      input,
      new File([JSON.stringify([DATA])], 'items.json', {
        type: 'application/json',
      })
    )
    await waitFor(() => expect(editor()).toHaveValue(JSON.stringify([DATA])))

    const created: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      created.push(blob as Blob)
      return 'blob:x'
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('master-data-bulk.json')
      })
    await userEvent.click(screen.getByRole('button', { name: 'JSON保存' }))
    expect(click).toHaveBeenCalledTimes(1)
    expect(await created[0]?.text()).toBe(JSON.stringify([DATA]))
  })

  it('has no axe violations while open', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <BulkImportDialog screen="settings" onImport={async () => {}} />
        </main>
      </MbcProvider>
    )
    await userEvent.click(screen.getByRole('button', { name: 'JSON editor' }))
    const result = await axe.run(document.body, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(result.violations.map((violation) => violation.id)).toEqual([])
  })
})
