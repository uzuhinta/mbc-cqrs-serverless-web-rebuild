'use client'

import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { X } from 'lucide-react'

import type {
  LongTextQuestion,
  ShortTextQuestion,
} from '../../schema/survey-schema'
import { creatorMessages, type CreatorMessages } from '../i18n/creator-messages'

/** v0's rule when "Response validation" is switched on. */
export const DEFAULT_RULES = {
  'short-text': { type: 'number', rule: 'eq' },
  'long-text': { type: 'length', rule: 'min' },
  'multiple-choice': { rule: 'min', value: 1 },
} as const

type DraftRule = {
  type?: string
  rule?: string
  value?: string | number
  value2?: number
  customError?: string
}

type RuleKey = keyof CreatorMessages['rules']

const RULES: Record<string, readonly [string, RuleKey][]> = {
  number: [
    ['gt', 'gt'],
    ['gte', 'gte'],
    ['lt', 'lt'],
    ['lte', 'lte'],
    ['eq', 'eq'],
    ['neq', 'neq'],
    ['between', 'between'],
    ['not_between', 'notBetween'],
    ['is_number', 'isNumber'],
    ['is_whole', 'isWhole'],
  ],
  text: [
    ['contains', 'contains'],
    ['not_contains', 'notContains'],
    ['is_email', 'isEmail'],
    ['is_url', 'isUrl'],
  ],
  length: [
    ['max', 'maxLength'],
    ['min', 'minLength'],
  ],
  regex: [
    ['contains', 'contains'],
    ['not_contains', 'notContains'],
    ['matches', 'matches'],
    ['not_matches', 'notMatches'],
  ],
}

const DEFAULT_RULE: Record<string, string> = {
  number: 'eq',
  text: 'contains',
  length: 'min',
  regex: 'matches',
}
const NO_VALUE = ['is_number', 'is_whole', 'is_email', 'is_url']
const UNDERLINE =
  'mbc:rounded-none mbc:border-0 mbc:border-b mbc:px-1 mbc:text-xs mbc:shadow-none mbc:placeholder:text-xs mbc:focus-visible:ring-0'

const toNumber = (text: string) => {
  if (text === '') return undefined
  const num = Number(text)
  return Number.isNaN(num) ? undefined : num
}

function RuleBuilder({
  rule,
  types,
  onChange,
  onClose,
}: {
  rule: DraftRule
  types: readonly ('number' | 'text' | 'length' | 'regex')[]
  onChange: (next: DraftRule) => void
  onClose: () => void
}) {
  const t = useMessages(creatorMessages)
  const numeric = rule.type === 'number' || rule.type === 'length'
  const needsValue = Boolean(rule.rule) && !NO_VALUE.includes(rule.rule ?? '')
  const needsTwo = rule.rule === 'between' || rule.rule === 'not_between'
  const drop = (key: 'value' | 'value2', value: unknown) => {
    const next = { ...rule, [key]: value }
    if (value === undefined) delete next[key]
    onChange(next)
  }

  return (
    <div className="mbc:mt-4 mbc:p-3">
      <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-2">
        <div className="mbc:flex mbc:w-full mbc:grow mbc:gap-2 mbc:sm:w-auto mbc:sm:grow-0">
          <Select
            value={rule.type}
            onValueChange={(type) => {
              const { customError } = rule
              onChange({
                type,
                rule: DEFAULT_RULE[type],
                ...(customError !== undefined && { customError }),
              })
            }}
          >
            <SelectTrigger
              size="xs"
              className="mbc:w-[120px] mbc:border-0"
              aria-label={t.rules.type}
            >
              <SelectValue placeholder={t.rules.type} />
            </SelectTrigger>
            <SelectContent>
              {types.map((type) => (
                <SelectItem key={type} value={type} className="mbc:text-xs">
                  {t.rules[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={rule.rule}
            onValueChange={(next) => onChange({ ...rule, rule: next })}
            disabled={!rule.type}
          >
            <SelectTrigger
              size="xs"
              className="mbc:w-[180px] mbc:border-0"
              aria-label={t.rules.rule}
            >
              <SelectValue placeholder={t.rules.rule} />
            </SelectTrigger>
            <SelectContent>
              {(RULES[rule.type ?? ''] ?? []).map(([value, key]) => (
                <SelectItem key={value} value={value} className="mbc:text-xs">
                  {t.rules[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {needsValue && (
          <div className="mbc:flex mbc:grow mbc:items-center mbc:gap-2">
            <Input
              type={numeric ? 'number' : 'text'}
              placeholder={t.rules.value}
              className={`mbc:min-w-[80px] mbc:grow ${UNDERLINE}`}
              value={rule.value ?? ''}
              onChange={(event) =>
                drop(
                  'value',
                  numeric ? toNumber(event.target.value) : event.target.value
                )
              }
            />
            {needsTwo && (
              <>
                ~
                <Input
                  type="number"
                  placeholder={t.rules.and}
                  className={`mbc:min-w-[80px] mbc:grow ${UNDERLINE}`}
                  value={rule.value2 ?? ''}
                  onChange={(event) =>
                    drop('value2', toNumber(event.target.value))
                  }
                />
              </>
            )}
          </div>
        )}
        <div className="mbc:flex mbc:w-full mbc:grow mbc:gap-2 mbc:sm:w-auto">
          <Input
            placeholder={t.rules.customError}
            className={`mbc:grow ${UNDERLINE}`}
            value={rule.customError ?? ''}
            onChange={(event) =>
              onChange({ ...rule, customError: event.target.value })
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mbc:shrink-0"
            aria-label={t.rules.close}
            onClick={onClose}
          >
            <X aria-hidden className="mbc:h-4 mbc:w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

function withoutCustom<Q extends ShortTextQuestion | LongTextQuestion>(
  question: Q
): Q {
  const { custom: _custom, ...validation } = question.validation ?? {}
  return { ...question, validation }
}

export function ShortTextEditor({
  question,
  onChange,
}: {
  question: ShortTextQuestion
  onChange: (next: ShortTextQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const custom = question.validation?.custom
  return (
    <>
      <div className="mbc:px-1 mbc:pt-4">
        <p className="mbc:text-muted-foreground mbc:pointer-events-none mbc:w-1/2 mbc:border-b mbc:border-dashed mbc:border-border mbc:text-sm">
          {t.preview.shortText}
        </p>
      </div>
      {custom && (
        <RuleBuilder
          rule={custom as DraftRule}
          types={['number', 'text', 'length', 'regex']}
          onChange={(next) =>
            onChange({
              ...question,
              validation: {
                ...question.validation,
                custom: next as NonNullable<typeof custom>,
              },
            })
          }
          onClose={() => onChange(withoutCustom(question))}
        />
      )}
    </>
  )
}

export function LongTextEditor({
  question,
  onChange,
}: {
  question: LongTextQuestion
  onChange: (next: LongTextQuestion) => void
}) {
  const t = useMessages(creatorMessages)
  const custom = question.validation?.custom
  return (
    <>
      <div className="mbc:px-1 mbc:pt-4">
        <div className="mbc:text-muted-foreground mbc:pointer-events-none mbc:min-h-[80px] mbc:w-full mbc:rounded mbc:border mbc:border-dashed mbc:border-border mbc:p-3 mbc:text-sm">
          {t.preview.longText}
        </div>
      </div>
      {custom && (
        <RuleBuilder
          rule={custom as DraftRule}
          types={['length', 'regex']}
          onChange={(next) =>
            onChange({
              ...question,
              validation: {
                ...question.validation,
                custom: next as NonNullable<typeof custom>,
              },
            })
          }
          onClose={() => onChange(withoutCustom(question))}
        />
      )}
    </>
  )
}
