'use client'

import {
  Button,
  Card,
  Separator,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { Plus, Tally4, Text, Type } from 'lucide-react'
import type { CSSProperties } from 'react'

import { creatorMessages } from './i18n/creator-messages'

/**
 * v0's bar beside the selected card (lg and up). Below lg it would overflow
 * the viewport, so it is fixed at the bottom right instead.
 */
export function FloatingActionBar({
  top,
  canAddQuestion,
  afterLocked,
  onAddQuestion,
  onAddSection,
}: {
  top: number
  canAddQuestion: boolean
  afterLocked: boolean
  onAddQuestion: () => void
  onAddSection: () => void
}) {
  const t = useMessages(creatorMessages)
  const addQuestion = canAddQuestion
    ? t.toolbar.addQuestion
    : t.toolbar.addQuestionLocked
  const addSection = afterLocked
    ? t.toolbar.addSectionAfterLocked
    : t.toolbar.addSection
  return (
    <Card
      role="toolbar"
      aria-label={t.toolbar.label}
      style={{ '--mbc-bar-top': `${top}px` } as CSSProperties}
      className="mbc:fixed mbc:bottom-4 mbc:right-4 mbc:z-20 mbc:flex mbc:flex-row mbc:items-center mbc:gap-2 mbc:p-2 mbc:transition-all mbc:duration-150 mbc:lg:absolute mbc:lg:bottom-auto mbc:lg:right-[-80px] mbc:lg:top-(--mbc-bar-top) mbc:lg:translate-y-[10%] mbc:lg:flex-col"
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={!canAddQuestion}
        onClick={onAddQuestion}
        title={addQuestion}
        aria-label={addQuestion}
      >
        <Plus aria-hidden className="mbc:h-5 mbc:w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        title={t.toolbar.importQuestions}
        aria-label={t.toolbar.importQuestions}
      >
        <Text aria-hidden className="mbc:h-5 mbc:w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled
        title={t.toolbar.addTitle}
        aria-label={t.toolbar.addTitle}
      >
        <Type aria-hidden className="mbc:h-5 mbc:w-5" />
      </Button>
      <Separator className="mbc:max-lg:hidden" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onAddSection}
        title={addSection}
        aria-label={addSection}
      >
        <Tally4 aria-hidden className="mbc:h-5 mbc:w-5" />
      </Button>
    </Card>
  )
}
