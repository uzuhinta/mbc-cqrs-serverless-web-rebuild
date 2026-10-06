import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  Field,
  FieldLabel,
  MultiSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@mbc-cqrs-serverless/ui-web'
import { useState } from 'react'

const TENANTS = [
  { value: 'tenant-a', label: 'Tenant A' },
  { value: 'tenant-b', label: 'Tenant B' },
  { value: 'tenant-c', label: 'Tenant C' },
]

/** Primitives added for master-web. */
export function MasterPrimitives() {
  const [tenants, setTenants] = useState<string[]>(['tenant-a'])
  return (
    <section className="mbc:flex mbc:flex-col mbc:gap-6 mbc:p-6">
      <Accordion type="multiple" defaultValue={['search', 'result']}>
        <AccordionItem value="search">
          <AccordionTrigger>Search</AccordionTrigger>
          <AccordionContent>
            <Field>
              <FieldLabel>Tenants</FieldLabel>
              <MultiSelect
                options={TENANTS}
                value={tenants}
                onValueChange={setTenants}
              />
            </Field>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="result">
          <AccordionTrigger>Result</AccordionTrigger>
          <AccordionContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {TENANTS.map((tenant) => (
                  <TableRow
                    key={tenant.value}
                    data-state={
                      tenants.includes(tenant.value) ? 'selected' : undefined
                    }
                  >
                    <TableCell>{tenant.value}</TableCell>
                    <TableCell>{tenant.label}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </section>
  )
}
