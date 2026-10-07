import { MbcProvider } from '@mbc-cqrs-serverless/ui-web'
import { render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { describe, expect, it } from 'vitest'

import type { MasterField } from '../core/types'
import { DataCell } from './data-cell'

const field = (dataType: string): MasterField => ({
  physicalName: 'f',
  name: 'F',
  dataType,
  isRequired: false,
  isShowedOnList: true,
})

const show = (element: ReactElement, locale: 'ja' | 'en' = 'ja') =>
  render(<MbcProvider locale={locale}>{element}</MbcProvider>).container

describe('DataCell', () => {
  it('pretty-prints JSON, stored as an object or as a string', () => {
    show(<DataCell field={field('json')} value={{ size: 'L' }} />)
    expect(screen.getByText(/"size": "L"/).closest('pre')).not.toBeNull()
    show(<DataCell field={field('json')} value='{"size":"S"}' />)
    expect(screen.getByText(/"size": "S"/)).toBeInTheDocument()
  })

  it('says "empty" for empty or missing JSON (v0)', () => {
    show(<DataCell field={field('json')} value={{}} />)
    show(<DataCell field={field('json')} value={undefined} />)
    expect(screen.getAllByText('empty')).toHaveLength(2)
  })

  it('shows booleans and lists like v0, reading "true" as true', () => {
    const cells = [
      show(<DataCell field={field('boolean')} value={true} />),
      show(<DataCell field={field('boolean')} value="true" />),
      show(<DataCell field={field('boolean')} value={false} />),
      show(<DataCell field={field('boolean')} value={undefined} />),
      show(<DataCell field={field('array')} value={['a', 'b']} />),
    ]
    expect(cells.map((cell) => cell.textContent)).toEqual([
      'true',
      'true',
      'false',
      '',
      '["a","b"]',
    ])
  })

  it('shows a date as written, in the locale’s form', () => {
    const value = '2026-10-07T23:30:00-05:00'
    expect(
      show(<DataCell field={field('date')} value={value} />).textContent
    ).toBe('2026年10月07日')
    expect(
      show(<DataCell field={field('date')} value={value} />, 'en').textContent
    ).toBe('2026-10-07')
    expect(
      show(<DataCell field={field('date')} value="soon" />).textContent
    ).toBe('soon')
  })

  it('shows other values as text and nothing for a missing one', () => {
    expect(
      show(<DataCell field={field('number')} value={1200} />).textContent
    ).toBe('1200')
    expect(
      show(<DataCell field={field('string')} value={null} />).textContent
    ).toBe('')
    expect(
      show(<DataCell field={field('text-area')} value={{ a: 1 }} />).textContent
    ).toBe('{"a":1}')
  })
})
