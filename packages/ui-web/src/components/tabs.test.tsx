import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { MbcProvider } from '../i18n/provider'
import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

function Example() {
  return (
    <Tabs defaultValue="edit" data-testid="tabs">
      <TabsList>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="edit">Editor</TabsContent>
      <TabsContent value="preview">Preview pane</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('keeps v0 classes on every part', () => {
    render(<Example />)
    const root = screen.getByTestId('tabs')

    expectV0Classes(root, V0.tabs)
    expect(root).toHaveAttribute('data-mbc', '')
    expectV0Classes(screen.getByRole('tablist'), V0['tabs.list'])
    expectV0Classes(
      screen.getByRole('tab', { name: 'Edit' }),
      V0['tabs.trigger']
    )
    expectV0Classes(screen.getByRole('tabpanel'), V0['tabs.content'])
  })

  it('switches panels', async () => {
    render(<Example />)
    await userEvent.click(screen.getByRole('tab', { name: 'Preview' }))

    expect(screen.getByRole('tabpanel')).toHaveTextContent('Preview pane')
  })

  it('follows the provider direction', () => {
    render(
      <MbcProvider dir="rtl">
        <Example />
      </MbcProvider>
    )
    expect(screen.getByTestId('tabs')).toHaveAttribute('dir', 'rtl')
  })
})
