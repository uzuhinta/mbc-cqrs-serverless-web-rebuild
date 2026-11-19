/** Why a data value is rejected; the text comes from the `master` messages. */
export type MasterError =
  | { key: 'required' }
  | { key: 'blank' }
  | { key: 'maxLength'; params: { max: number } }
  | { key: 'maxRows'; params: { max: number } }
  | { key: 'pattern'; params: { name: string } }
  | { key: 'integer' }
  | { key: 'min'; params: { min: number } }
  | { key: 'max'; params: { max: number } }
  | { key: 'json' }
  | { key: 'keyChars' }
  | { key: 'reserved' }
