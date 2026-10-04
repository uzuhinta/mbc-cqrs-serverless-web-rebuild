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
}

export const uiMessages = defineMessages('ui', { ja, en })
