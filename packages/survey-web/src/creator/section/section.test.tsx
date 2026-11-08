import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'

import { itemById, renderCreator } from '../../../test/creator-harness'
import { LOCKED_SECOND, LOCKS } from '../../../test/fixtures/creator-surveys'
import { classesOf, v0c } from '../../../test/v0-creator-classes'
import type { Survey } from '../../schema/survey-schema'
import { SectionAction } from './section-action'
import { SectionCard } from './section-card'
import { SectionReorderDialog } from './section-reorder-dialog'

const openMenu = async () => {
  await userEvent.click(
    screen.getByRole('button', { name: 'セクションのオプション' })
  )
  return screen.findByRole('menu')
}

describe('SectionCard', () => {
  it('shows v0’s numbered tab and view card', () => {
    renderCreator(<SectionCard id="sec_open" />)
    expect(classesOf(screen.getByText('セクション 2 / 3'))).toEqual(
      v0c('section.tab')
    )
    expect(
      classesOf(screen.getByText('Open').closest('[data-section-view]'))
    ).toEqual(v0c('section.view'))
  })

  it('edits the title and description when selected', async () => {
    const { store } = renderCreator(<SectionCard id="sec_open" />, {
      selectedId: 'sec_open',
    })
    const title = screen.getByPlaceholderText('未タイトルセクション')
    await userEvent.clear(title)
    await userEvent.type(title, '基本')
    await userEvent.type(screen.getByPlaceholderText('説明 (任意)'), 'D')
    expect(itemById(store, 'sec_open')).toMatchObject({
      title: '基本',
      description: 'D',
    })
    await userEvent.click(
      screen.getByRole('button', { name: 'セクションを閉じる' })
    )
    expect(store.getState().selectedId).toBeNull()
  })

  it('keeps a selected locked section read-only with delete and merge disabled (v0)', async () => {
    renderCreator(<SectionCard id="sec_locked" />, { selectedId: 'sec_locked' })
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(
      screen.getByRole('img', { name: 'ロックされたセクション' })
    ).toBeInTheDocument()
    const menu = await openMenu()
    expect(
      within(menu).getByRole('menuitem', { name: /セクションを削除/ })
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      within(menu).getByRole('menuitem', { name: '上のセクションとマージ' })
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('cannot be merged into a locked section above (v0)', async () => {
    renderCreator(<SectionCard id="sec_c" />, { survey: LOCKED_SECOND })
    const menu = await openMenu()
    expect(
      within(menu).getByRole('menuitem', { name: '上のセクションとマージ' })
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('cannot delete a section holding a locked question, and says why (v0)', async () => {
    renderCreator(<SectionCard id="sec_open" />)
    const menu = await openMenu()
    expect(
      within(menu).getByRole('menuitem', { name: /ロックされた質問を含む/ })
    ).toHaveAttribute('aria-disabled', 'true')
  })

  it('duplicates a locked section as an unlocked copy (v0)', async () => {
    const { store } = renderCreator(<SectionCard id="sec_locked" />)
    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'セクションを複製' })
    )
    const copy = store.getState().survey.items[2]
    expect(copy).toMatchObject({
      type: 'section-header',
      title: 'Locked（コピー）',
    })
    expect(copy).not.toHaveProperty('locked')
    expect(store.getState().selectedId).toBe(copy?.id)
  })

  it('merges with the section above', async () => {
    const { store } = renderCreator(<SectionCard id="sec_last" />)
    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: '上のセクションとマージ' })
    )
    expect(itemById(store, 'sec_last')).toBeUndefined()
    expect(itemById(store, 'q_last')).toBeDefined()
  })

  it('deletes a section and its questions after confirming', async () => {
    const { store } = renderCreator(<SectionCard id="sec_last" />)
    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'セクションを削除' })
    )
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('質問とセクションを削除しますか？')
    await userEvent.click(within(dialog).getByRole('button', { name: '削除' }))
    expect(itemById(store, 'sec_last')).toBeUndefined()
    expect(itemById(store, 'q_last')).toBeUndefined()
  })

  it('opens the reorder dialog from the menu', async () => {
    const { creatorUi } = renderCreator(<SectionCard id="sec_open" />)
    let opened = false
    creatorUi.openReorder = () => {
      opened = true
    }
    const menu = await openMenu()
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'セクションを移動' })
    )
    expect(opened).toBe(true)
  })
})

describe('SectionAction', () => {
  it('jumps, submits or continues after a section', async () => {
    const { store } = renderCreator(<SectionAction sectionId="sec_locked" />)
    expect(screen.getByText('1 セクション後')).toBeInTheDocument()
    const select = screen.getByRole('combobox', { name: '1 セクション後' })

    await userEvent.click(select)
    await userEvent.click(
      await screen.findByRole('option', { name: '3 セクションに移動 (Last)' })
    )
    expect(itemById(store, 'sec_locked')).toMatchObject({
      action: { type: 'jump', targetSectionId: 'sec_last' },
    })

    await userEvent.click(select)
    await userEvent.click(
      await screen.findByRole('option', { name: 'フォームを送信' })
    )
    expect(itemById(store, 'sec_locked')).toMatchObject({
      action: { type: 'submit' },
    })

    await userEvent.click(select)
    await userEvent.click(
      await screen.findByRole('option', { name: '次のセクションに進む' })
    )
    expect(itemById(store, 'sec_locked')).not.toHaveProperty('action')
  })

  it('warns when the target section is gone', () => {
    const survey: Survey = {
      ...LOCKS,
      items: LOCKS.items.map((item) =>
        item.id === 'sec_open'
          ? {
              ...item,
              action: { type: 'jump' as const, targetSectionId: 'sec_gone' },
            }
          : item
      ),
    }
    renderCreator(<SectionAction sectionId="sec_open" />, { survey })
    expect(
      screen.getByText('移動先のセクションが見つかりません')
    ).toBeInTheDocument()
  })
})

describe('SectionReorderDialog', () => {
  function Harness() {
    const [open, setOpen] = useState(true)
    return <SectionReorderDialog open={open} onOpenChange={setOpen} />
  }

  it('spaces its title and list apart (ui-web’s Dialog is not a grid)', () => {
    renderCreator(<Harness />)
    expect(
      screen.getByRole('dialog', { name: 'セクションを移動' })
    ).toHaveClass('mbc:grid', 'mbc:gap-4')
  })

  it('reorders sections from the keyboard and saves', async () => {
    const { store } = renderCreator(<Harness />)
    const dialog = screen.getByRole('dialog', { name: 'セクションを移動' })
    stackRects(dialog, '[data-section-row]')
    const [first] = within(dialog).getAllByRole('button', {
      name: /ドラッグして並べ替え/,
    })
    first!.focus()
    await userEvent.keyboard(' ')
    await userEvent.keyboard('{ArrowDown}')
    expect(first).toHaveAttribute('aria-roledescription', '並べ替え可能')
    expect(
      screen.getByText('「Locked」を「Open」の位置に移動しました。')
    ).toBeInTheDocument()
    await userEvent.keyboard(' ')
    expect(within(dialog).getAllByText(/^セクション \d \/ 3$/)).toHaveLength(3)
    await userEvent.click(within(dialog).getByRole('button', { name: '保存' }))

    expect(
      store
        .getState()
        .survey.items.filter((i) => i.type === 'section-header')
        .map((i) => i.id)
    ).toEqual(['sec_open', 'sec_locked', 'sec_last'])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('discards the order on cancel', async () => {
    const { store } = renderCreator(<Harness />)
    await userEvent.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(store.getState().survey).toBe(LOCKS)
  })
})

function stackRects(container: HTMLElement, selector: string) {
  const rect = (top: number, height: number) =>
    ({
      x: 0,
      y: top,
      top,
      left: 0,
      bottom: top + height,
      right: 300,
      width: 300,
      height,
      toJSON: () => ({}),
    }) as DOMRect
  const rows = () => [...container.querySelectorAll<HTMLElement>(selector)]
  for (const row of rows()) {
    row.getBoundingClientRect = () => rect(rows().indexOf(row) * 60, 50)
  }
}
