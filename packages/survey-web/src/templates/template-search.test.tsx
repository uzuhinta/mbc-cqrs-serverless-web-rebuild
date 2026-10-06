import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { classesOf, v0t } from '../../test/v0-template-classes'
import { TemplateSearch } from './template-search'

describe('TemplateSearch', () => {
  it('reports the keyword once after typing pauses (v0: 300 ms)', async () => {
    const onChange = vi.fn()
    render(<TemplateSearch value="" onChange={onChange} />)
    const input = screen.getByRole('searchbox', {
      name: 'テキスト・タグ・IDで検索',
    })
    expect(classesOf(input)).toEqual(
      expect.arrayContaining(v0t('search.input'))
    )
    await userEvent.type(input, 'abc')
    expect(onChange).not.toHaveBeenCalled()
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(onChange.mock.calls).toEqual([['abc']])
  })

  it('follows the value it is given without echoing it back', async () => {
    const onChange = vi.fn()
    function Host() {
      const [value, setValue] = useState('first')
      return (
        <>
          <button type="button" onClick={() => setValue('second')}>
            set
          </button>
          <TemplateSearch value={value} onChange={onChange} />
        </>
      )
    }
    render(<Host />)
    await userEvent.click(screen.getByRole('button', { name: 'set' }))
    expect(screen.getByRole('searchbox')).toHaveValue('second')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(onChange).not.toHaveBeenCalled()
  })
})
