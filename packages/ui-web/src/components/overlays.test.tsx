import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { MbcProvider } from '../i18n/provider'
import { expectV0Classes } from '../../test/parity'
import { V0 } from '../../test/v0-classes'
import { buttonVariants } from './button-variants'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './dialog'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from './popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'

function OpenDialog() {
  return (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader data-testid="header">
          <DialogTitle>Edit survey</DialogTitle>
          <DialogDescription>Change the title</DialogDescription>
        </DialogHeader>
        <DialogFooter data-testid="footer">Footer</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('renders content and overlay as library roots with v0 classes', () => {
    render(<OpenDialog />)
    const dialog = screen.getByRole('dialog', { name: 'Edit survey' })
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')

    expect(dialog).toHaveAttribute('data-mbc', '')
    expectV0Classes(dialog, V0['dialog.content'])
    expect(overlay).toHaveAttribute('data-mbc', '')
    expectV0Classes(overlay as Element, V0['dialog.overlay'])
    expectV0Classes(screen.getByText('Edit survey'), V0['dialog.title'])
    expectV0Classes(
      screen.getByText('Change the title'),
      V0['dialog.description']
    )
    expectV0Classes(screen.getByTestId('header'), V0['dialog.header'])
    expectV0Classes(screen.getByTestId('footer'), V0['dialog.footer'])
  })

  it('labels the close button in Japanese by default', () => {
    render(<OpenDialog />)
    const close = screen.getByRole('button', { name: '閉じる' })

    expectV0Classes(close, V0['dialog.close'])
  })

  it('labels the close button from the provider locale', () => {
    render(
      <MbcProvider locale="en">
        <OpenDialog />
      </MbcProvider>
    )
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('portals into the provider container', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    render(
      <MbcProvider portalContainer={container}>
        <OpenDialog />
      </MbcProvider>
    )
    expect(within(container).getByRole('dialog')).toBeInTheDocument()
    container.remove()
  })

  it('can hide the close button', () => {
    render(
      <Dialog defaultOpen>
        <DialogContent showCloseButton={false} aria-describedby={undefined}>
          <DialogTitle>No close</DialogTitle>
        </DialogContent>
      </Dialog>
    )
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('AlertDialog', () => {
  it('styles actions with button variants', () => {
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
    const dialog = screen.getByRole('alertdialog', { name: 'Delete?' })

    expect(dialog).toHaveAttribute('data-mbc', '')
    expectV0Classes(dialog, V0['alert-dialog.content'])
    expectV0Classes(screen.getByText('Delete?'), V0['alert-dialog.title'])
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveClass(
      ...buttonVariants().split(' ')
    )
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveClass(
      ...buttonVariants({ variant: 'outline' }).split(' ')
    )
  })
})

describe('Popover', () => {
  it('renders content as a library root with v0 classes', () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Body</PopoverContent>
      </Popover>
    )
    const content = screen.getByText('Body')

    expect(content).toHaveAttribute('data-mbc', '')
    expectV0Classes(content, V0['popover.content'])
  })
})

describe('DropdownMenu', () => {
  it('renders items with v0 classes and a working disabled state', () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuLabel>Type</DropdownMenuLabel>
          <DropdownMenuSeparator data-testid="separator" />
          <DropdownMenuItem>Duplicate</DropdownMenuItem>
          <DropdownMenuCheckboxItem checked disabled>
            Required
          </DropdownMenuCheckboxItem>
          <DropdownMenuRadioGroup value="a">
            <DropdownMenuRadioItem value="a">Option A</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    )
    const menu = screen.getByRole('menu')

    expect(menu).toHaveAttribute('data-mbc', '')
    expectV0Classes(menu, V0['dropdown-menu.content'])
    expectV0Classes(
      screen.getByRole('menuitem', { name: 'Duplicate' }),
      V0['dropdown-menu.item']
    )
    const required = screen.getByRole('menuitemcheckbox', { name: 'Required' })
    expectV0Classes(required, V0['dropdown-menu.choice-item'])
    expect(required).toHaveAttribute('data-disabled')
    expectV0Classes(
      screen.getByRole('menuitemradio', { name: 'Option A' }),
      V0['dropdown-menu.choice-item']
    )
    expectV0Classes(screen.getByText('Type'), V0['dropdown-menu.label'])
    expectV0Classes(
      screen.getByTestId('separator'),
      V0['dropdown-menu.separator']
    )
  })
})

describe('nested overlays', () => {
  it('keeps a dialog open when choosing from a select inside it', async () => {
    const user = userEvent.setup()
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Edit</DialogTitle>
          <DialogDescription>Pick a fruit</DialogDescription>
          <Select>
            <SelectTrigger aria-label="Fruit">
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="apple">Apple</SelectItem>
            </SelectContent>
          </Select>
        </DialogContent>
      </Dialog>
    )
    await user.click(screen.getByRole('combobox', { name: 'Fruit' }))
    await user.click(await screen.findByRole('option', { name: 'Apple' }))

    expect(screen.getByRole('dialog', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Fruit' })).toHaveTextContent(
      'Apple'
    )
  })
})
