'use client'

import {
  BulkImportDialog,
  MASTER_FIELD_TYPES,
  MasterLink,
  MbcProvider,
  masterMessages,
  useMessages,
  type MasterRouting,
} from '@mbc-cqrs-serverless/master-web'
import { MultiSelect } from '@mbc-cqrs-serverless/ui-web'

function FieldTypes() {
  const t = useMessages(masterMessages)
  return (
    <ul>
      {MASTER_FIELD_TYPES.map((type) => (
        <li key={type}>{t.fieldTypes[type]}</li>
      ))}
    </ul>
  )
}

const routing: MasterRouting = {
  href: (target) => `/master/${target.screen}`,
  navigate: () => {},
}

/** master-web's client entry and the new ui-web parts, rendered on the server and hydrated. */
export function MasterScreens() {
  return (
    <MbcProvider locale="ja">
      <FieldTypes />
      <MasterLink routing={routing} to={{ screen: 'settings' }}>
        master settings
      </MasterLink>
      <BulkImportDialog screen="settings" onImport={async () => {}} />
      <MultiSelect
        options={[{ value: 'a', label: 'A' }]}
        value={['a']}
        onValueChange={() => {}}
      />
    </MbcProvider>
  )
}
