import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { FakeJsonEditor } from '../../test/fake-json-editor'
import { V0_DATA, V0_DATA_ODD, V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterData, parseMasterSetting } from '../core/parse'
import type {
  MasterDataCreateBody,
  MasterDataUpdateBody,
} from '../core/payload'
import type { MasterData, MasterField, MasterSetting } from '../core/types'
import type { FieldRendererProps } from '../renderers/registry'
import type { MasterRouting } from '../routing/routing'
import {
  MasterDataEditor,
  type MasterDataEditorProps,
} from './master-data-editor'

const routing: MasterRouting = {
  href: (to) =>
    'settingId' in to
      ? `/${to.screen}/${encodeURIComponent(to.settingId)}`
      : `/${to.screen}`,
  navigate: vi.fn(),
}

/** The fixture's setting; its price field gets a description. */
function setting(): MasterSetting {
  const parsed = parseMasterSetting(V0_SETTING)
  if (!parsed.success) throw parsed.error
  const price = parsed.data.attributes.fields.find(
    (field) => field.physicalName === 'price'
  )!
  price.description = '税込'
  return parsed.data
}

/** The fixture's setting with a typed code instead of an auto-numbered one. */
function typedCodeSetting(): MasterSetting {
  const result = setting()
  result.attributes.fields = result.attributes.fields.map((field) =>
    field.physicalName === 'code'
      ? {
          physicalName: 'code',
          name: 'コード',
          dataType: 'string',
          isRequired: true,
          isShowedOnList: true,
        }
      : field
  )
  return result
}

function record(): MasterData {
  const parsed = parseMasterData(V0_DATA)
  if (!parsed.success) throw parsed.error
  return parsed.data
}

function setup(overrides: Partial<MasterDataEditorProps> = {}) {
  const onSave = vi.fn<MasterDataEditorProps['onSave']>(async () => {})
  const props: MasterDataEditorProps = {
    mode: 'edit',
    setting: setting(),
    data: record(),
    routing,
    tenantCode: 'tenant-a',
    onSave,
    ...overrides,
  }
  render(<MasterDataEditor {...props} />)
  return { onSave }
}

const button = (name: string) => screen.getByRole('button', { name })
const input = (name: string) => screen.getByRole('textbox', { name })
const lastBody = (fn: { mock: { calls: unknown[][] } }) =>
  fn.mock.calls.at(-1)?.[0] as MasterDataCreateBody & MasterDataUpdateBody

describe('MasterDataEditor', () => {
  it('creates a record from the setting’s fields, starting from their defaults', async () => {
    const checkCodeUnique = vi.fn(async () => true)
    const { onSave } = setup({
      mode: 'create',
      setting: typedCodeSetting(),
      data: undefined,
      checkCodeUnique,
    })
    expect(input('価格')).toHaveAccessibleDescription('※税込')
    expect(screen.getByRole('switch', { name: '有効' })).toBeChecked()
    await userEvent.type(input('コード'), ' P-9 ')
    await userEvent.type(input('名称'), 'なし')
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    expect(checkCodeUnique).toHaveBeenCalledWith('P-9')
    expect(lastBody(onSave)).toMatchObject({
      settingCode: 'PRODUCT',
      code: 'P-9',
      name: 'なし',
      attributes: { code: 'P-9', price: '500', active: true },
    })
  })

  it('numbers an auto-numbered code once, when saving', async () => {
    const pending: ((code: string) => void)[] = []
    const generateCode = vi.fn(
      (_field: MasterField, _setting: MasterSetting) =>
        new Promise<string>((resolve) => pending.push(resolve))
    )
    const { onSave } = setup({ mode: 'create', data: undefined, generateCode })
    const code = input('コード')
    expect(code).toBeDisabled()
    expect(code).toHaveAttribute('placeholder', '商品番号')
    await userEvent.type(input('名称'), 'なし')
    await userEvent.type(input('価格'), '500')
    // Two submits in one tick (a double Enter): the second must not number again.
    const form = button('登録').closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(generateCode).toHaveBeenCalledTimes(1)
    expect(generateCode.mock.calls[0]![0].physicalName).toBe('code')
    for (const resolve of pending) resolve('P-100')
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1))
    expect(lastBody(onSave)).toMatchObject({
      code: 'P-100',
      attributes: { code: 'P-100' },
    })
    // Created: the host moves on; saving again would number another record.
    expect(button('登録')).toBeDisabled()
  })

  it('refuses values the fields do not allow, says why and focuses the first', async () => {
    const { onSave } = setup({
      mode: 'create',
      setting: typedCodeSetting(),
      data: undefined,
      checkCodeUnique: async () => false,
    })
    await userEvent.type(input('価格'), '1.5')
    await userEvent.click(button('登録'))
    expect(input('コード')).toHaveAccessibleDescription('入力してください。')
    expect(input('コード')).toHaveFocus()
    expect(input('価格')).toHaveAccessibleDescription(
      '※税込 数字を入力してください。'
    )
    await userEvent.type(input('コード'), 'P-001')
    await userEvent.click(button('登録'))
    expect(input('コード')).toHaveAccessibleDescription(
      '既にこのコードは登録されています。'
    )
    expect(onSave).not.toHaveBeenCalled()
  })

  it('opens a stored record for viewing, then edits and saves it', async () => {
    const { onSave } = setup()
    expect(input('価格')).toBeDisabled()
    expect(input('価格')).toHaveValue('1200')
    await userEvent.click(button('編集'))
    expect(input('コード')).toBeDisabled()
    expect(button('登録')).toBeDisabled()
    await userEvent.clear(input('価格'))
    await userEvent.type(input('価格'), '1300')
    await userEvent.click(button('登録'))
    const body = lastBody(onSave)
    expect(body).not.toHaveProperty('settingCode')
    expect(body).toMatchObject({ name: 'りんご', seq: 3 })
    expect(body.attributes).toMatchObject({
      price: '1300',
      importedBy: 'batch-7',
      spec: { size: 'L' },
    })
    expect(await screen.findByRole('button', { name: '編集' })).toBeVisible()
    expect(input('価格')).toHaveValue('1300')
  })

  it('clears in a later save a value an earlier save added', async () => {
    const data = record()
    delete data.attributes.sku
    const { onSave } = setup({ data })
    await userEvent.click(button('編集'))
    await userEvent.type(input('SKU'), 'AP-9')
    await userEvent.click(button('登録'))
    await userEvent.click(await screen.findByRole('button', { name: '編集' }))
    await userEvent.clear(input('SKU'))
    await userEvent.click(button('登録'))
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2))
    // The backend keeps a key an update leaves out.
    expect(lastBody(onSave).attributes).toHaveProperty('sku', '')
  })

  it('saves values v0 stored in other types unchanged when they were not edited', async () => {
    const parsed = parseMasterData(V0_DATA_ODD)
    if (!parsed.success) throw parsed.error
    const { onSave } = setup({
      data: { ...parsed.data, tenantCode: 'tenant-a' },
    })
    expect(input('価格')).toHaveValue('980')
    expect(screen.getByRole('switch', { name: '有効' })).toBeChecked()
    await userEvent.click(button('編集'))
    await userEvent.type(input('名称'), '!')
    await userEvent.click(button('登録'))
    expect(lastBody(onSave)).toMatchObject({ name: 'みかん!', seq: 0 })
    // Untouched values keep their stored type; like v0, the record's code,
    // name and seq are written into the attributes too.
    expect(lastBody(onSave).attributes).toEqual({
      ...(V0_DATA_ODD as { attributes: object }).attributes,
      code: 'P-002',
      name: 'みかん!',
      seq: '0',
    })
  })

  it('cancels editing back to the stored values; a typed code stays locked', async () => {
    setup({ setting: typedCodeSetting() })
    await userEvent.click(button('編集'))
    expect(input('コード')).toBeDisabled()
    await userEvent.type(input('価格'), '9')
    await userEvent.click(button('キャンセル'))
    expect(input('価格')).toHaveValue('1200')
  })

  it('asks for a code and a name when the setting has no such fields (v0)', async () => {
    const bare = setting()
    bare.attributes.fields = bare.attributes.fields.filter(
      (field) => !['code', 'name'].includes(field.physicalName)
    )
    const { onSave } = setup({ mode: 'create', setting: bare, data: undefined })
    await userEvent.type(input('コード'), 'X-1')
    await userEvent.type(input('名称'), 'エックス')
    await userEvent.type(input('価格'), '1')
    await userEvent.click(button('登録'))
    expect(lastBody(onSave)).toMatchObject({ code: 'X-1', name: 'エックス' })
    expect(lastBody(onSave).attributes).not.toHaveProperty('name')
  })

  it('deletes and restores after confirmation, swapping the two buttons (v0)', async () => {
    const onDelete = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue()
    const onRestore = vi.fn(async () => {})
    setup({ onDelete, onRestore })
    const confirm = async (trigger: string, action: string) => {
      await userEvent.click(button(trigger))
      await userEvent.click(
        within(screen.getByRole('alertdialog')).getByRole('button', {
          name: action,
        })
      )
    }
    await confirm('削除', '削除')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'データ削除に失敗しました。'
    )
    await confirm('削除', '削除')
    await screen.findByRole('button', { name: '復旧' })
    await confirm('復旧', '復旧')
    expect(onRestore).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('button', { name: '削除' })).toBeVisible()
  })

  it('edits the record JSON in the host’s JSON editor', async () => {
    setup({ jsonEditor: FakeJsonEditor })
    await userEvent.click(button('編集'))
    await userEvent.click(button('JSONエディタ'))
    const json = screen.getByRole('textbox', { name: 'JSON' })
    expect(json).toHaveAttribute('data-editor', 'fake')
    expect(JSON.parse((json as HTMLTextAreaElement).value)).toMatchObject({
      code: 'P-001',
    })
  })

  it('applies a record JSON, keeping the stored code', async () => {
    setup()
    await userEvent.click(button('編集'))
    await userEvent.click(button('JSONエディタ'))
    const json = screen.getByRole('textbox', { name: 'JSON' })
    const current = JSON.parse((json as HTMLTextAreaElement).value)
    expect(current).toMatchObject({ settingCode: 'PRODUCT', code: 'P-001' })
    await userEvent.clear(json)
    await userEvent.click(json)
    await userEvent.paste('{"settingCode":"PRODUCT"}')
    await userEvent.click(button('データ反映'))
    expect(screen.getByRole('alert')).toHaveTextContent(
      'settingCode、code、name'
    )
    const next = {
      ...current,
      code: 'OTHER',
      attributes: { ...current.attributes, price: '777' },
    }
    await userEvent.clear(json)
    await userEvent.click(json)
    await userEvent.paste(JSON.stringify(next))
    await userEvent.click(button('データ反映'))
    expect(input('価格')).toHaveValue('777')
    expect(input('コード')).toHaveValue('P-001')
  })

  it('keeps Save off after a create whose outcome is unknown', async () => {
    const timeout = Object.assign(new Error('late'), {
      name: 'MbcTimeoutError',
    })
    const generateCode = vi.fn(async () => 'P-100')
    const onSave = vi.fn<MasterDataEditorProps['onSave']>(async () => {
      throw timeout
    })
    setup({ mode: 'create', data: undefined, generateCode, onSave })
    await userEvent.type(input('名称'), 'なし')
    await userEvent.type(input('価格'), '500')
    await userEvent.click(button('登録'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '時間内に結果を確認できませんでした。'
    )
    expect(button('登録')).toBeDisabled()
    expect(generateCode).toHaveBeenCalledTimes(1)
  })

  it('applies the JSON a new auto-numbered record opens with', async () => {
    setup({ mode: 'create', data: undefined })
    await userEvent.type(input('名称'), 'なし')
    await userEvent.click(button('JSONエディタ'))
    await userEvent.click(button('データ反映'))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'JSON' })).toBeNull()
    expect(input('名称')).toHaveValue('なし')
  })

  it('says when saving failed, and when the outcome is unknown', async () => {
    const timeout = Object.assign(new Error('late'), {
      name: 'MbcTimeoutError',
    })
    const onSave = vi
      .fn<MasterDataEditorProps['onSave']>()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(timeout)
    setup({ onSave })
    await userEvent.click(button('編集'))
    await userEvent.type(input('価格'), '1')
    await userEvent.click(button('登録'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'データ更新に失敗しました。'
    )
    await userEvent.click(button('登録'))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '時間内に結果を確認できませんでした。'
    )
  })

  it('treats its own tenant’s record as its own in any case (the backend lowercases it)', () => {
    setup({
      data: { ...record(), tenantCode: 'tenant-a' },
      tenantCode: 'TENANT-A',
    })
    expect(button('編集')).toBeVisible()
  })

  it('opens another tenant’s record read-only with a way back to the list', () => {
    setup({
      data: { ...record(), tenantCode: 'common' },
      onDelete: async () => {},
    })
    expect(
      screen.getByText('他のテナントのデータのため、編集できません。')
    ).toBeVisible()
    for (const link of screen.getAllByRole('link', { name: '戻る' }))
      expect(link).toHaveAttribute(
        'href',
        `/data/${encodeURIComponent(setting().id)}`
      )
    for (const name of ['編集', '削除', '復旧', 'JSONエディタ'])
      expect(screen.queryByRole('button', { name })).toBeNull()
    expect(input('価格')).toBeDisabled()
  })

  it('renders a field with the host’s renderer for its type', async () => {
    function Shout({ id, value, onChange, disabled }: FieldRendererProps) {
      return (
        <input
          id={id}
          value={String(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
        />
      )
    }
    const { onSave } = setup({ components: { 'text-area': Shout } })
    await userEvent.click(button('編集'))
    await userEvent.clear(input('メモ'))
    await userEvent.type(input('メモ'), 'abc')
    await userEvent.click(button('登録'))
    expect(lastBody(onSave).attributes.memo).toBe('ABC')
  })

  it('focuses an invalid field’s control by its id, even when it is not an input', async () => {
    function Editable({ id, labelId, invalid }: FieldRendererProps) {
      return (
        <div>
          <button type="button">太字</button>
          <div
            id={id}
            role="textbox"
            tabIndex={0}
            contentEditable
            aria-labelledby={labelId}
            aria-invalid={invalid || undefined}
          />
        </div>
      )
    }
    const required = setting()
    required.attributes.fields = required.attributes.fields.map((field) =>
      field.physicalName === 'memo' ? { ...field, isRequired: true } : field
    )
    const { onSave } = setup({
      setting: required,
      data: { ...record(), attributes: { ...record().attributes, memo: '' } },
      components: { 'text-area': Editable },
    })
    await userEvent.click(button('編集'))
    await userEvent.type(input('価格'), '1')
    await userEvent.click(button('登録'))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByRole('textbox', { name: 'メモ' })).toHaveFocus()
  })

  it('shows loading, then a load failure with a reload button', async () => {
    const onRetry = vi.fn()
    const { rerender } = render(
      <MasterDataEditor
        mode="edit"
        routing={routing}
        loading
        onSave={async () => {}}
      />
    )
    expect(screen.getByRole('status')).toBeInTheDocument()
    rerender(
      <MasterDataEditor
        mode="edit"
        routing={routing}
        error={new Error('x')}
        onRetry={onRetry}
        onSave={async () => {}}
      />
    )
    await userEvent.click(button('再読み込み'))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('has no axe violations and renders on the server', async () => {
    const element = (
      <MbcProvider locale="en">
        <main>
          <MasterDataEditor
            mode="edit"
            setting={setting()}
            data={record()}
            routing={routing}
            tenantCode="tenant-a"
            onSave={async () => {}}
            onDelete={async () => {}}
          />
        </main>
      </MbcProvider>
    )
    expect(renderToString(element)).toContain('Add item')
    render(element)
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})
