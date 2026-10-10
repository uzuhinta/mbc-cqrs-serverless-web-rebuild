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

/** An editor between two buttons; "after" also re-renders the page without changing the value. */
function Around({
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
  const [, setRenders] = useState(0)
  const id = useId()
  return (
    <div>
      <button type="button">before</button>
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
        disabled={disabled}
      />
      <button type="button" onClick={() => setRenders((n) => n + 1)}>
        after
      </button>
    </div>
  )
}

describe('safety, stored values and the keyboard', () => {
  it('never renders the stored Markdown’s raw HTML or script links', async () => {
    const attack = [
      '<iframe srcdoc="<script>parent.x=1</script>"></iframe>',
      '<style>body{display:none}</style>',
      '<form action="https://example.com/"><input name="a"></form>',
      '[link](javascript:alert(1))',
    ].join('\n\n')
    const { container } = render(
      <Labelled Editor={MarkdownEditor} initial={attack} disabled />
    )
    await loaded('.wmde-markdown')
    expect(container.querySelector('iframe, style, form')).toBeNull()
    for (const link of container.querySelectorAll('a'))
      expect(link.getAttribute('href') ?? '').not.toMatch(/^javascript:/i)
  })

  it('reports rich text with plain spaces, and an empty editor as empty', async () => {
    const onChange = vi.fn()
    render(
      <Labelled
        Editor={RichTextEditor}
        initial="<p>a b</p>"
        onChange={onChange}
      />
    )
    const editor = await loaded('.ql-editor[aria-labelledby]')
    await userEvent.click(editor)
    await userEvent.keyboard('X')
    const typed = onChange.mock.calls.at(-1)?.[0] as string
    expect(typed).not.toContain('&nbsp;')
    expect(typed).toContain(' b')
    await userEvent.keyboard('{Control>}a{/Control}{Backspace}')
    expect(onChange).toHaveBeenLastCalledWith('')
  })

  it('leaves Quill alone when the page re-renders with the same value', async () => {
    render(<Around Editor={RichTextEditor} initial="<p>a b</p>" />)
    const editor = await loaded('.ql-editor[aria-labelledby]')
    let mutations = 0
    const observer = new MutationObserver((records) => {
      mutations += records.length
    })
    observer.observe(editor, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    for (let i = 0; i < 3; i++)
      await userEvent.click(screen.getByRole('button', { name: 'after' }))
    observer.disconnect()
    expect(mutations).toBe(0)
  })

  it.each([
    ['rich text', RichTextEditor, '.ql-editor[aria-labelledby]', '<p>a</p>'],
    ['Markdown', MarkdownEditor, '.w-md-editor textarea', '# a'],
    ['JSON', JsonEditor, 'textarea.ace_text-input[aria-labelledby]', '{"a":1}'],
  ] as const)(
    'lets Tab and Shift+Tab leave the %s editor',
    async (_name, Editor, selector, initial) => {
      render(<Around Editor={Editor} initial={initial} />)
      const input = await loaded(selector)
      // jsdom has no CSS, so the next stop may be a control the library
      // hides in a browser: check only that the focus moved on, or back.
      const moved = () =>
        input.compareDocumentPosition(document.activeElement ?? input)
      input.focus()
      await userEvent.tab()
      expect(moved() & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      input.focus()
      await userEvent.tab({ shift: true })
      expect(moved() & Node.DOCUMENT_POSITION_PRECEDING).toBeTruthy()
    }
  )

  it('switches JsonEditor to read-only code mode when a disabled value is not JSON', async () => {
    const view = render(<JsonValue value='{"a":1}' disabled />)
    await loaded('.jsoneditor-tree')
    view.rerender(<JsonValue value="<p>x</p>" disabled />)
    await loaded('textarea.ace_text-input')
    expect(view.container.querySelector('.jsoneditor-tree')).toBeNull()
    expect(aceValue()).toBe('<p>x</p>')
  })

  it('goes back to the read-only tree when JsonEditor is disabled again', async () => {
    const view = render(<JsonValue value='{"a":1}' disabled={false} />)
    await loaded('textarea.ace_text-input')
    view.rerender(<JsonValue value='{"a":1}' disabled />)
    await loaded('.jsoneditor-tree')
    expect(view.container.querySelector('textarea.ace_text-input')).toBeNull()
  })

  it('shows the stored JSON text exactly when editing starts', async () => {
    const text = '{"a":1,  "b":[1,2]}'
    const view = render(<JsonValue value={text} disabled />)
    await loaded('.jsoneditor-tree')
    view.rerender(<JsonValue value={text} disabled={false} />)
    await loaded('textarea.ace_text-input')
    expect(aceValue()).toBe(text)
  })
})

/** A JsonEditor whose value the test sets from outside. */
function JsonValue({ value, disabled }: { value: string; disabled: boolean }) {
  return <JsonEditor value={value} onChange={() => {}} disabled={disabled} />
}

/** The text in Ace's document (jsdom does not draw Ace's text layer). */
function aceValue() {
  const element = document.querySelector('.ace_editor') as
    (Element & { env?: { editor?: { getValue(): string } } }) | null
  return element?.env?.editor?.getValue()
}

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
