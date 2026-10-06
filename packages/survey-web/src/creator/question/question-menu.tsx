'use client'

import {
  Button,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { MoreVertical } from 'lucide-react'

import type { SurveyQuestion } from '../../schema/survey-schema'
import { creatorMessages } from '../i18n/creator-messages'
import { DEFAULT_RULES } from './text-validation'

type Props = {
  question: SurveyQuestion
  set: (next: SurveyQuestion) => void
  showDescription: boolean
  onShowDescription: (show: boolean) => void
  showBranching: boolean
  onShowBranching: (show: boolean) => void
}

function withoutKey<T extends object, K extends keyof T>(
  value: T,
  key: K
): Omit<T, K> {
  const { [key]: _dropped, ...rest } = value
  return rest
}

/** v0's ⋮ menu: what the card shows and the kind-specific switches. */
export function QuestionMenu({
  question,
  set,
  showDescription,
  onShowDescription,
  showBranching,
  onShowBranching,
}: Props) {
  const t = useMessages(creatorMessages)
  const validation = question.validation ?? {}
  const hasCustom = 'custom' in validation && validation.custom !== undefined
  const setValidation = (next: object) =>
    set({ ...question, validation: next } as SurveyQuestion)
  const shuffle =
    'options' in question ? (
      <DropdownMenuCheckboxItem
        checked={question.validation?.shuffleOptions === true}
        onCheckedChange={(checked) =>
          setValidation({ ...validation, shuffleOptions: checked })
        }
      >
        {t.question.shuffleOptions}
      </DropdownMenuCheckboxItem>
    ) : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={t.question.more}
        >
          <MoreVertical aria-hidden className="mbc:h-4 mbc:w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t.question.show}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={showDescription}
          onCheckedChange={(checked) => {
            onShowDescription(checked)
            if (!checked)
              set(withoutKey(question, 'description') as SurveyQuestion)
          }}
        >
          {t.question.description}
        </DropdownMenuCheckboxItem>
        {(question.type === 'short-text' ||
          question.type === 'long-text' ||
          question.type === 'multiple-choice') && (
          <DropdownMenuCheckboxItem
            checked={hasCustom}
            onCheckedChange={(checked) =>
              setValidation(
                checked
                  ? {
                      ...validation,
                      custom: { ...DEFAULT_RULES[question.type] },
                    }
                  : withoutKey(validation as { custom?: unknown }, 'custom')
              )
            }
          >
            {t.question.responseValidation}
          </DropdownMenuCheckboxItem>
        )}
        {(question.type === 'single-choice' ||
          question.type === 'dropdown') && (
          <>
            <DropdownMenuSeparator />
            {shuffle}
            <DropdownMenuCheckboxItem
              checked={showBranching}
              onCheckedChange={(checked) => {
                onShowBranching(checked)
                if (!checked) {
                  set({
                    ...question,
                    options: question.options.map((option) =>
                      withoutKey(option, 'nextSectionId')
                    ),
                  })
                }
              }}
            >
              {t.question.branching}
            </DropdownMenuCheckboxItem>
          </>
        )}
        {question.type === 'multiple-choice' && (
          <>
            <DropdownMenuSeparator />
            {shuffle}
          </>
        )}
        {question.type === 'date' && (
          <>
            <DropdownMenuCheckboxItem
              checked={question.includeTime === true}
              onCheckedChange={(checked) =>
                set({ ...question, includeTime: checked })
              }
            >
              {t.question.includeTime}
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={question.includeYear !== false}
              onCheckedChange={(checked) =>
                set({ ...question, includeYear: checked })
              }
            >
              {t.question.includeYear}
            </DropdownMenuCheckboxItem>
          </>
        )}
        {question.type === 'time' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>{t.question.answerType}</DropdownMenuLabel>
            <DropdownMenuRadioGroup
              value={question.answerType ?? 'time'}
              onValueChange={(value) =>
                set({ ...question, answerType: value as 'time' | 'duration' })
              }
            >
              <DropdownMenuRadioItem value="time">
                {t.question.answerTime}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="duration">
                {t.question.answerDuration}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
