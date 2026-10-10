import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { COPY_REQUESTS, COPY_TENANT_TASKS } from '../../test/fixtures/v0-copy'
import type { CopyTask } from '../core/copy'
import type { MasterRouting } from '../routing/routing'
import { MasterCopyTaskDetail } from './master-copy-task-detail'
import { MasterCopyTaskList } from './master-copy-task-list'

const SETTING = 'MASTER#tenant-a#MASTER_SETTING#a/b c'

const routing: MasterRouting = {
  href: (to) =>
    [
      to.screen,
      'settingId' in to ? to.settingId : '',
      'id' in to ? to.id : '',
      'taskId' in to ? to.taskId : '',
    ]
      .filter(Boolean)
      .map(encodeURIComponent)
      .join('/'),
  navigate: vi.fn(),
}

const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent)

async function axeClean() {
  const result = await axe.run(document.body, {
    rules: {
      'color-contrast': { enabled: false },
      region: { enabled: false },
    },
  })
  expect(result.violations.map((violation) => violation.id)).toEqual([])
}

describe('MasterCopyTaskList', () => {
  it('shows v0’s columns, one row per copy request', () => {
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
      />
    )
    expect(
      screen.getByRole('heading', { name: 'コピー結果一覧' })
    ).toBeInTheDocument()
    const table = screen.getByRole('table', { name: 'コピー結果一覧' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent)
    ).toEqual([
      '名前',
      '開始時間',
      '終了時間',
      '総数',
      '実行中数',
      '成功数',
      '失敗数',
      '状態',
    ])
    const [running, done] = within(table).getAllByRole('row').slice(1)
    expect(cells(running!)).toEqual([
      'PRODUCT#01J9B',
      '2026/10/10 10:30:00',
      '-',
      '3',
      '1',
      '1',
      '1',
      '処理中',
    ])
    expect(cells(done!)).toEqual([
      'PRODUCT#01J9A',
      '2026/10/10 09:05:07',
      '2026/10/10 09:06:40',
      '2',
      '0',
      '2',
      '0',
      '終了',
    ])
  })

  it('links each request to its details and Back to the setting, ids intact', () => {
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
      />
    )
    expect(screen.getByRole('link', { name: 'PRODUCT#01J9B' })).toHaveAttribute(
      'href',
      `copyTask/${encodeURIComponent(SETTING)}/${encodeURIComponent(COPY_REQUESTS[0]!.id)}`
    )
    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute(
      'href',
      `setting/${encodeURIComponent(SETTING)}`
    )
  })

  it('keeps v0’s status colours', () => {
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
      />
    )
    expect(screen.getByText('終了')).toHaveClass(
      'mbc:bg-[#BBF7D0]',
      'mbc:text-[#14532D]',
      'mbc:border-[#4ADE80]'
    )
    expect(screen.getByText('処理中')).toHaveClass(
      'mbc:bg-[#FEF9C3]',
      'mbc:text-[#92400E]'
    )
  })

  it('shows a status it does not know as it is', () => {
    const task: CopyTask = { ...COPY_REQUESTS[0]!, status: 'PAUSED' }
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={[task]}
        routing={routing}
      />
    )
    expect(screen.getByText('PAUSED')).toBeInTheDocument()
  })

  it('shows ten requests a page', async () => {
    const tasks = Array.from({ length: 12 }, (_, n) => ({
      ...COPY_REQUESTS[1]!,
      id: `${COPY_REQUESTS[1]!.id}-${n}`,
      sk: `MASTER_COPY_PRODUCT#${String(n).padStart(2, '0')}`,
    }))
    render(
      <MasterCopyTaskList settingId={SETTING} tasks={tasks} routing={routing} />
    )
    const table = screen.getByRole('table', { name: 'コピー結果一覧' })
    expect(within(table).getAllByRole('row')).toHaveLength(11)
    const [pager] = screen.getAllByRole('navigation')
    await userEvent.click(within(pager!).getByRole('link', { name: '2' }))
    expect(within(table).getAllByRole('row')).toHaveLength(3)
    expect(
      within(table).getByRole('link', { name: 'PRODUCT#11' })
    ).toBeInTheDocument()
  })

  it('refreshes, and offers a reload when loading failed', async () => {
    const onRefresh = vi.fn()
    const { rerender } = render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
        onRefresh={onRefresh}
      />
    )
    await userEvent.click(
      screen.getByRole('button', { name: '最新の状態に更新' })
    )
    expect(onRefresh).toHaveBeenCalledTimes(1)
    rerender(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={[]}
        routing={routing}
        error={new Error('down')}
        onRefresh={onRefresh}
      />
    )
    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('読み込みに失敗しました。')
    await userEvent.click(
      within(alert).getByRole('button', { name: '再読み込み' })
    )
    expect(onRefresh).toHaveBeenCalledTimes(2)
  })

  it('turns Refresh off while loading', () => {
    render(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
        loading
        onRefresh={() => {}}
      />
    )
    expect(
      screen.getByRole('button', { name: '最新の状態に更新' })
    ).toBeDisabled()
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
  })

  it('has no axe violations, and renders on the server without the times', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <MasterCopyTaskList
            settingId={SETTING}
            tasks={COPY_REQUESTS}
            routing={routing}
            onRefresh={() => {}}
          />
        </main>
      </MbcProvider>
    )
    expect(screen.getByRole('heading', { name: 'Copy results' })).toBeVisible()
    await axeClean()
    const html = renderToString(
      <MasterCopyTaskList
        settingId={SETTING}
        tasks={COPY_REQUESTS}
        routing={routing}
      />
    )
    expect(html).toContain('PRODUCT#01J9A')
    expect(html).toContain(`dateTime="${COPY_REQUESTS[1]!.createdAt}"`)
    expect(html).not.toContain('2026/10/10')
  })
})

describe('MasterCopyTaskDetail', () => {
  it('shows each destination tenant’s result (v0’s columns)', () => {
    render(
      <MasterCopyTaskDetail
        settingId={SETTING}
        tasks={COPY_TENANT_TASKS}
        routing={routing}
      />
    )
    const table = screen.getByRole('table', { name: 'コピー結果詳細' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((cell) => cell.textContent)
    ).toEqual([
      'テナントコード',
      '状態',
      '開始時間',
      '終了時間',
      'メッセージ',
      'タスクID',
    ])
    const [copied, failed, running] = within(table).getAllByRole('row').slice(1)
    expect(cells(copied!)).toEqual([
      'tenant-b',
      '終了',
      '2026/10/10 10:30:00',
      '2026/10/10 10:30:45',
      'コピー成功',
      'MASTER_COPY_PRODUCT#01J9B#0',
    ])
    expect(cells(failed!)).toEqual([
      'tenant-c',
      '失敗',
      '2026/10/10 10:30:00',
      '-',
      'Error: Master setting does not exist',
      'MASTER_COPY_PRODUCT#01J9B#1',
    ])
    // v0 said "succeeded" here too, before the copy had finished.
    expect(cells(running!)).toEqual([
      'tenant-d',
      '処理中',
      '2026/10/10 10:30:00',
      '-',
      '-',
      'MASTER_COPY_PRODUCT#01J9B#2',
    ])
  })

  it('goes back to the setting’s copy results', () => {
    render(
      <MasterCopyTaskDetail
        settingId={SETTING}
        tasks={COPY_TENANT_TASKS}
        routing={routing}
      />
    )
    expect(screen.getByRole('link', { name: '戻る' })).toHaveAttribute(
      'href',
      `copyTasks/${encodeURIComponent(SETTING)}`
    )
  })

  it('has no axe violations and renders on the server', async () => {
    render(
      <main>
        <MasterCopyTaskDetail
          settingId={SETTING}
          tasks={COPY_TENANT_TASKS}
          routing={routing}
          onRefresh={() => {}}
        />
      </main>
    )
    await axeClean()
    expect(
      renderToString(
        <MasterCopyTaskDetail
          settingId={SETTING}
          tasks={COPY_TENANT_TASKS}
          routing={routing}
        />
      )
    ).toContain('tenant-c')
  })
})
