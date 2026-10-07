import { defineMessages } from './catalog'

interface InterfaceTyped {
  close: string
  required: string
  pagination: {
    label: string
    previous: string
    next: string
    morePages: string
    page: (params: { page: number }) => string
  }
  multiSelect: {
    placeholder: string
    search: string
    empty: string
    checked: string
    options: string
  }
}

const messages: InterfaceTyped = {
  close: 'x',
  required: 'x',
  pagination: {
    label: 'x',
    previous: 'x',
    next: 'x',
    morePages: 'x',
    page: () => 'x',
  },
  multiSelect: {
    placeholder: 'x',
    search: 'x',
    empty: 'x',
    checked: 'x',
    options: 'x',
  },
}

// Interface-typed catalogs are accepted.
export const ok = defineMessages('ui', { ja: messages, en: messages })

// @ts-expect-error unknown namespace
export const typo = defineMessages('uii', { ja: messages, en: messages })
