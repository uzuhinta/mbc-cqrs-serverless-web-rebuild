import { defineMessages } from './catalog'

export type UiMessages = {
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
    /** Read by screen readers after a chosen option ("selected" is the highlighted one). */
    checked: string
    /** Name of the open option list. */
    options: string
  }
}

const ja: UiMessages = {
  close: '閉じる',
  required: '必須',
  pagination: {
    label: 'ページ送り',
    previous: '前のページへ',
    next: '次のページへ',
    morePages: '省略されたページ',
    page: ({ page }) => `${page}ページ目`,
  },
  multiSelect: {
    placeholder: '選択してください',
    search: '検索...',
    empty: 'データがありません',
    checked: 'チェック済み',
    options: '選択肢',
  },
}

const en: UiMessages = {
  close: 'Close',
  required: 'required',
  pagination: {
    label: 'pagination',
    previous: 'Go to previous page',
    next: 'Go to next page',
    morePages: 'More pages',
    page: ({ page }) => `Page ${page}`,
  },
  multiSelect: {
    placeholder: 'Select options...',
    search: 'Search...',
    empty: 'No data',
    checked: 'checked',
    options: 'Options',
  },
}

export const uiMessages = defineMessages('ui', { ja, en })
