import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from './command'

describe('Command', () => {
  it('keeps v0 classes and filters items as you type', async () => {
    const onSelect = vi.fn()
    render(
      <Command data-testid="command" label="Fruit">
        <CommandInput placeholder="Search" />
        <CommandList data-testid="list">
          <CommandEmpty>Nothing</CommandEmpty>
          <CommandGroup data-testid="group">
            <CommandItem onSelect={onSelect}>Apple</CommandItem>
            <CommandItem>Banana</CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    )
    const input = screen.getByPlaceholderText('Search')

    expectV0Classes(screen.getByTestId('command'), V0.command)
    expect(screen.getByTestId('command')).toHaveAttribute('data-mbc', '')
    expectV0Classes(input, V0['command.input'])
    expectV0Classes(
      input.parentElement as HTMLElement,
      V0['command.input-wrapper']
    )
    expectV0Classes(screen.getByTestId('list'), V0['command.list'])
    expectV0Classes(screen.getByTestId('group'), V0['command.group'])
    expectV0Classes(
      screen.getByRole('option', { name: 'Apple' }),
      V0['command.item']
    )

    await userEvent.type(input, 'ban')
    expect(screen.queryByRole('option', { name: 'Apple' })).toBeNull()
    await userEvent.clear(input)
    await userEvent.type(input, 'zzz')
    expectV0Classes(screen.getByText('Nothing'), V0['command.empty'])

    await userEvent.clear(input)
    await userEvent.type(input, 'app{Enter}')
    expect(onSelect).toHaveBeenCalledTimes(1)
  })
})
