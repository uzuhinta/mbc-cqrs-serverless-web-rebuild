import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { useId, useState } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { MASTER_FIELD_TYPES } from '../core/field-type-names'
import { fieldTypes, type FormValue } from '../core/field-types'
import type { MasterField } from '../core/types'
import { defaultRenderers, rendererType } from './registry'

const field = (overrides: Partial<MasterField>): MasterField => ({
  physicalName: 'value',
  name: '項目',
  dataType: 'string',
  isRequired: false,
  isShowedOnList: true,
  ...overrides,
})

/** A renderer under a real label, holding its own value. */
function Harness({
  of,
  initial,
  onChange = () => {},
  disabled = false,
}: {
  of: MasterField
  initial: FormValue
  onChange?: (value: FormValue) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState(initial)
  const id = useId()
  const Renderer = defaultRenderers[rendererType(of)]
  return (
    <div>
      <label id={`${id}label`} htmlFor={`${id}control`}>
        {of.name}
      </label>
      <Renderer
        field={of}
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
        onBlur={() => {}}
        id={`${id}control`}
        labelId={`${id}label`}
        describedBy={`${id}hint`}
        invalid={false}
        disabled={disabled}
      />
      <p id={`${id}hint`}>※説明</p>
    </div>
  )
}

describe('field renderers', () => {
  it('edits text and numbers in labelled inputs with v0’s placeholders', async () => {
    const onChange = vi.fn()
    render(<Harness of={field({})} initial="" onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: '項目' })
    expect(input).toHaveAttribute('placeholder', 'テキストを入力してください。')
    expect(input).toHaveAccessibleDescription('※説明')
    await userEvent.type(input, 'ab')
    expect(onChange).toHaveBeenLastCalledWith('ab')
  })

  it('uses a text area for a string with more than one row, and for the text types', () => {
    render(
      <>
        <Harness of={field({ name: '複数行', maxRow: 3 })} initial="" />
        <Harness
          of={field({ name: '本文', dataType: 'text-html' })}
          initial=""
        />
      </>
    )
    expect(screen.getByRole('textbox', { name: '複数行' }).tagName).toBe(
      'TEXTAREA'
    )
    expect(screen.getByRole('textbox', { name: '本文' }).tagName).toBe(
      'TEXTAREA'
    )
  })

  it('switches a boolean', async () => {
    const onChange = vi.fn()
    render(
      <Harness
        of={field({ name: '有効', dataType: 'boolean' })}
        initial={false}
        onChange={onChange}
      />
    )
    await userEvent.click(screen.getByRole('switch', { name: '有効' }))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('edits a list: add, change and remove items (v0)', async () => {
    const onChange = vi.fn()
    render(
      <Harness
        of={field({ name: 'タグ', dataType: 'array' })}
        initial={['fruit']}
        onChange={onChange}
      />
    )
    expect(screen.getByRole('group', { name: 'タグ' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'アイテム追加' }))
    await userEvent.type(
      screen.getByRole('textbox', { name: 'タグ 2件目' }),
      'red'
    )
    expect(onChange).toHaveBeenLastCalledWith(['fruit', 'red'])
    await userEvent.click(
      screen.getByRole('button', { name: 'タグ 2件目を削除' })
    )
    expect(onChange).toHaveBeenLastCalledWith(['fruit'])
  })

  it('picks a date and stores it as v0 did, with the time zone', async () => {
    const onChange = vi.fn()
    render(
      <Harness
        of={field({ name: '発売日', dataType: 'date' })}
        initial="2026-10-07T00:00:00+09:00"
        onChange={onChange}
      />
    )
    const trigger = screen.getByRole('button', { name: /発売日/ })
    // The stored calendar date, whatever the browser's time zone.
    expect(trigger).toHaveTextContent('2026/10/07')
    await userEvent.click(trigger)
    await userEvent.click(
      await screen.findByRole('button', { name: /10月15日/ })
    )
    expect(onChange).toHaveBeenCalledWith(
      expect.stringMatching(/^2026-10-15T00:00:00[+-]\d{2}:\d{2}$/)
    )
    expect(screen.getByRole('button', { name: /発売日/ })).toHaveTextContent(
      '2026/10/15'
    )
  })

  it('shows an auto-numbered code as read-only, naming its sequence', () => {
    render(
      <Harness
        of={field({
          name: 'コード',
          dataType: 'auto_number',
          formatName: '商品番号',
        })}
        initial=""
      />
    )
    const input = screen.getByRole('textbox', { name: 'コード' })
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('placeholder', '商品番号')
  })

  it('renders a type this version does not know as text', () => {
    expect(rendererType(field({ dataType: 'geo' }))).toBe('string')
    expect(rendererType(field({ dataType: 'json' }))).toBe('json')
  })

  it('leaves every value alone on mount and renders on the server', () => {
    const onChange = vi.fn()
    const all = MASTER_FIELD_TYPES.map((type) =>
      field({ physicalName: type, name: type, dataType: type })
    )
    const element = (
      <MbcProvider>
        {all.map((each) => (
          <Harness
            key={each.physicalName}
            of={each}
            initial={fieldTypes[each.dataType as 'string'].toFormValue(
              undefined
            )}
            onChange={onChange}
          />
        ))}
      </MbcProvider>
    )
    expect(renderToString(element)).toContain('アイテム追加')
    render(element)
    expect(onChange).not.toHaveBeenCalled()
  })

  it('has no axe violations', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <Harness
            of={field({ dataType: 'array', name: 'Tags' })}
            initial={['a']}
          />
          <Harness of={field({ dataType: 'date', name: 'Day' })} initial="" />
          <Harness of={field({ dataType: 'json', name: 'Spec' })} initial="" />
        </main>
      </MbcProvider>
    )
    const results = await axe.run(document.body)
    expect(results.violations).toEqual([])
  })
})
