import { render } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import { SurveyTemplateEditor } from '../src/templates/survey-template-editor'
import { SurveyTemplateList } from '../src/templates/survey-template-list'

const run = async () => {
  const result = await axe.run(document.body, {
    rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
  })
  return result.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`
  )
}

describe('template screens accessibility', () => {
  it('list with cards and pagination', async () => {
    render(
      <SurveyTemplateList
        items={Array.from({ length: 3 }, (_, i) => ({
          id: String(i),
          name: `T${i}`,
          version: 1,
          questionCount: i,
          sectionCount: 1,
        }))}
        total={40}
        page={2}
        pageSize={10}
        keyword=""
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        onKeywordChange={() => {}}
        onCreate={() => {}}
        onSelect={() => {}}
      />
    )
    expect(await run()).toEqual([])
  })

  it('editor', async () => {
    render(
      <SurveyTemplateEditor
        mode="edit"
        defaultValue={{
          title: 'T',
          items: [{ id: 's', type: 'section-header', title: 'S' }],
        }}
        onSave={() => {}}
        onCancel={() => {}}
        onDelete={() => {}}
      />
    )
    expect(await run()).toEqual([])
  })
})
