import { render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { describe, expect, it } from 'vitest'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  Input,
  MbcProvider,
  MultiSelect,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  RadioGroup,
  RadioGroupItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '../src/index'

// jsdom cannot compute colours; the playground probe covers contrast.
const OPTIONS: axe.RunOptions = {
  rules: { 'color-contrast': { enabled: false }, region: { enabled: false } },
}

async function violations(): Promise<string[]> {
  const result = await axe.run(document.body, OPTIONS)
  return result.violations.map(
    (violation) =>
      `${violation.id}: ${violation.nodes.map((n) => n.target).join(', ')}`
  )
}

describe('accessibility', () => {
  it('has no axe violations across the primitives', async () => {
    render(
      <MbcProvider locale="en">
        <main>
          <Field>
            <FieldLabel required>Email</FieldLabel>
            <Input type="email" />
            <FieldDescription>Work address</FieldDescription>
          </Field>
          <Field invalid>
            <FieldLabel>Notes</FieldLabel>
            <Textarea />
            <FieldError>Too short</FieldError>
          </Field>
          <Field>
            <FieldLabel>Agree</FieldLabel>
            <Checkbox />
          </Field>
          <Field>
            <FieldLabel>Tenants</FieldLabel>
            <MultiSelect
              options={[{ value: 'a', label: 'Alpha' }]}
              value={['a']}
              onValueChange={() => {}}
            />
          </Field>
          <Field>
            <FieldLabel>Colour</FieldLabel>
            <RadioGroup defaultValue="red">
              <RadioGroupItem value="red" aria-label="Red" />
              <RadioGroupItem value="blue" aria-label="Blue" />
            </RadioGroup>
          </Field>
          <Field>
            <FieldLabel>Notify</FieldLabel>
            <Switch />
          </Field>
          <Field>
            <FieldLabel>Fruit</FieldLabel>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Pick one" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apple">Apple</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Tabs defaultValue="a">
            <TabsList>
              <TabsTrigger value="a">First</TabsTrigger>
              <TabsTrigger value="b">Second</TabsTrigger>
            </TabsList>
            <TabsContent value="a">Panel</TabsContent>
          </Tabs>
          <Table>
            <TableCaption>Members</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Alice</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious href="#1" />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink href="#2" isActive>
                  2
                </PaginationLink>
              </PaginationItem>
              <PaginationItem>
                <PaginationEllipsis />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext href="#3" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
          <Alert>
            <AlertTitle>Saved</AlertTitle>
            <AlertDescription>All changes stored</AlertDescription>
          </Alert>
          <Card>
            <CardHeader>
              <CardTitle>Card</CardTitle>
            </CardHeader>
            <CardContent>Body</CardContent>
          </Card>
          <Badge>New</Badge>
          <Button>Save</Button>
          <Calendar mode="single" defaultMonth={new Date(2026, 9, 1)} />
        </main>
      </MbcProvider>
    )
    expect(await violations()).toEqual([])
  })

  it('has no axe violations on Accordion alone', async () => {
    // Accordion Header is Radix's h3; AlertTitle is h5 — together they trip
    // heading-order in the primitives suite, so Accordion is checked alone.
    render(
      <MbcProvider locale="en">
        <main>
          <Accordion type="single" collapsible defaultValue="a">
            <AccordionItem value="a">
              <AccordionTrigger>Details</AccordionTrigger>
              <AccordionContent>Body</AccordionContent>
            </AccordionItem>
          </Accordion>
        </main>
      </MbcProvider>
    )
    expect(await violations()).toEqual([])
  })

  it('has no axe violations in an open dialog', async () => {
    render(
      <Dialog defaultOpen>
        <DialogContent>
          <DialogTitle>Edit</DialogTitle>
          <DialogDescription>Change the title</DialogDescription>
        </DialogContent>
      </Dialog>
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(await violations()).toEqual([])
  })
})
