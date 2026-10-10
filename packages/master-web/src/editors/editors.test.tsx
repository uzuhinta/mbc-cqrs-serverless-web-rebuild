import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useId, useState, type ComponentType } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { V0_DATA, V0_SETTING } from '../../test/fixtures/v0-master'
import { parseMasterData, parseMasterSetting } from '../core/parse'
import type { MasterDataUpdateBody } from '../core/payload'
import { MasterDataEditor } from '../data/master-data-editor'
import type { MasterRouting } from '../routing/routing'
import {
  editorRenderers,
  JsonEditor,
  MarkdownEditor,
  RichTextEditor,
  type EditorProps,
} from './index'

/** An editor under a real label and description, holding its own value. */
function Labelled({
  Editor,
  initial,
  onChange = () => {},
  disabled = false,
}: {
  Editor: ComponentType<EditorProps>
  initial: string
  onChange?: (value: string) => void
  disabled?: boolean
}) {
  const [value, setValue] = useState(initial)
  const id = useId()
  return (
    <div>
      <label id={`${id}label`} htmlFor={`${id}control`}>
        本文
      </label>
      <Editor
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
        id={`${id}control`}
        labelId={`${id}label`}
        describedBy={`${id}hint`}
        disabled={disabled}
      />
      <p id={`${id}hint`}>※説明</p>
    </div>
  )
}

/**
 * Waits for the library's own element (until then the fallback text box is
 * there). Ask for it labelled: the label is set in an effect after it appears.
 */
const loaded = (selector: string) =>
  waitFor(
    () => {
      const element = document.querySelector<HTMLElement>(selector)
      if (!element) throw new Error(`${selector} has not loaded`)
      return element
    },
    // The editors are large modules; give them time under a full test run.
    { timeout: 5000 }
  )

describe('rich editors', () => {
  it('render a plain text box on the server, and load the editor after mount', async () => {
    const html = renderToString(
      <Labelled Editor={RichTextEditor} initial="<p>甘い</p>" />
    )
    expect(html).toContain('<textarea')
    expect(html).not.toContain('ql-editor')

    render(<Labelled Editor={RichTextEditor} initial="<p>甘い</p>" />)
    await loaded('.ql-editor[aria-labelledby]')
    const editor = screen.getByRole('textbox', { name: '本文' })
    expect(editor).toHaveClass('ql-editor')
    expect(editor).toHaveAccessibleDescription('※説明')
    expect(editor.innerHTML).toBe('<p>甘い</p>')
  })

  it('keep the label when the library rebuilds its element (StrictMode mounts twice)', async () => {
    render(
      <StrictMode>
        <Labelled Editor={RichTextEditor} initial="<p>甘い</p>" />
      </StrictMode>
    )
    await loaded('.ql-editor[aria-labelledby]')
    await new Promise((resolve) => setTimeout(resolve, 50))
    const editors = document.querySelectorAll('.ql-editor')
    expect(editors).toHaveLength(1)
    expect(editors[0]).toHaveAccessibleName('本文')
  })

  it('report only the user’s edits: loading the editor changes nothing', async () => {
    const onChange = vi.fn()
    render(
      <Labelled Editor={RichTextEditor} initial="plain" onChange={onChange} />
    )
    const editor = await loaded('.ql-editor[aria-labelledby]')
    // Quill turned the text into a paragraph without reporting it.
    expect(editor.innerHTML).toBe('<p>plain</p>')
    expect(onChange).not.toHaveBeenCalled()
    await userEvent.click(editor)
    await userEvent.keyboard('X')
    expect(onChange).toHaveBeenLastCalledWith(
      expect.stringMatching(/^<p>.*X.*<\/p>/)
    )
  })

  it('make the rich-text editor read-only, without its toolbar, when disabled', async () => {
    const { container } = render(
      <Labelled Editor={RichTextEditor} initial="<p>甘い</p>" disabled />
    )
    const editor = await loaded('.ql-editor[aria-labelledby]')
    expect(editor).toHaveAttribute('contenteditable', 'false')
    expect(
      container.querySelector('[data-disabled] .ql-toolbar')
    ).not.toBeNull()
  })

  it('edit Markdown in a labelled text box, and preview it when disabled', async () => {
    const onChange = vi.fn()
    const { rerender } = render(
      <Labelled
        Editor={MarkdownEditor}
        initial="# りんご"
        onChange={onChange}
      />
    )
    await loaded('.w-md-editor')
    const area = screen.getByRole('textbox', { name: '本文' })
    expect(area).toHaveAccessibleDescription('※説明')
    await userEvent.type(area, '!')
    expect(onChange).toHaveBeenLastCalledWith('# りんご!')

    rerender(<Labelled Editor={MarkdownEditor} initial="# りんご" disabled />)
    await waitFor(() =>
      expect(screen.queryByRole('textbox', { name: '本文' })).toBeNull()
    )
    // The harness keeps the text typed above.
    expect(screen.getByRole('heading', { name: 'りんご!' })).toBeInTheDocument()
  })

  it('edit JSON in code mode, follow outside changes, and view it when disabled', async () => {
    const onChange = vi.fn()
    const { container } = render(
      <Labelled Editor={JsonEditor} initial='{"a":1}' onChange={onChange} />
    )
    await loaded('textarea.ace_text-input[aria-labelledby]')
    const input = screen.getByRole('textbox', { name: '本文' })
    expect(input).toHaveClass('ace_text-input')
    expect(input).toHaveAccessibleDescription('※説明')
    expect(onChange).not.toHaveBeenCalled()
    input.focus()
    await userEvent.keyboard('X')
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('X{"a":1}'))
    expect(container.querySelector('.jsoneditor-tree')).toBeNull()
  })

  it('show JSON read-only when disabled', async () => {
    const { container } = render(
      <Labelled Editor={JsonEditor} initial='{"a":1}' disabled />
    )
    await loaded('.jsoneditor-tree')
    expect(container.querySelector('textarea.ace_text-input')).toBeNull()
  })
})

describe('JsonEditor with text that is not JSON', () => {
  it('shows it in code mode, read-only, when disabled, instead of failing', async () => {
    const onChange = vi.fn()
    const { container } = render(
      <Labelled
        Editor={JsonEditor}
        initial="{ not json"
        onChange={onChange}
        disabled
      />
    )
    const input = await loaded('textarea.ace_text-input[aria-labelledby]')
    expect(container.querySelector('.jsoneditor-tree')).toBeNull()
    input.focus()
    await userEvent.keyboard('X')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('editorRenderers', () => {
  const routing: MasterRouting = { href: () => '#', navigate: () => {} }

  it('plug into the data editor; untouched fields save unchanged', async () => {
    const setting = parseMasterSetting(V0_SETTING)
    const data = parseMasterData(V0_DATA)
    if (!setting.success || !data.success) throw new Error('fixture')
    const onSave = vi.fn(async (_body: unknown) => {})
    render(
      <MasterDataEditor
        mode="edit"
        setting={setting.data}
        data={data.data}
        routing={routing}
        components={editorRenderers}
        onSave={onSave}
      />
    )
    expect(Object.keys(editorRenderers).sort()).toEqual([
      'json',
      'text-html',
      'text-markdown',
    ])
    await loaded('.ql-editor[aria-labelledby]')
    await userEvent.click(screen.getByRole('button', { name: '編集' }))
    const price = screen.getByRole('textbox', { name: '価格' })
    await userEvent.clear(price)
    await userEvent.type(price, '1300')
    await userEvent.click(screen.getByRole('button', { name: '登録' }))
    const body = onSave.mock.calls.at(-1)?.[0] as MasterDataUpdateBody
    expect(body.attributes).toMatchObject({
      price: '1300',
      body: '<p>甘い</p>',
      notes: '# りんご',
      spec: { size: 'L' },
    })
  })
})
