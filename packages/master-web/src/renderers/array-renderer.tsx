'use client'

import { Button, Input, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { Plus, Trash2 } from 'lucide-react'

import { masterDataMessages } from '../i18n/master-data-messages'
import type { FieldRendererProps } from './types'

/** `array`: v0's list of texts, each with a remove button, and "アイテム追加". */
export function ArrayRenderer({
  field,
  value,
  onChange,
  onBlur,
  id,
  labelId,
  describedBy,
  invalid,
  disabled,
}: FieldRendererProps) {
  const t = useMessages(masterDataMessages).renderers
  const items = Array.isArray(value) ? value : []
  const name = field.name || field.physicalName
  return (
    <div
      id={id}
      role="group"
      aria-labelledby={labelId}
      aria-describedby={describedBy}
      className="mbc:flex mbc:flex-col mbc:gap-2"
    >
      {items.map((item, index) => (
        <div key={index} className="mbc:flex mbc:items-center mbc:gap-2">
          <Input
            value={item}
            disabled={disabled}
            onBlur={onBlur}
            aria-label={t.item({ name, n: index + 1 })}
            aria-invalid={invalid || undefined}
            className="mbc:flex-1"
            onChange={(event) =>
              onChange(
                items.map((entry, at) =>
                  at === index ? event.target.value : entry
                )
              )
            }
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={disabled}
            aria-label={t.removeItem({ name, n: index + 1 })}
            onClick={() => onChange(items.filter((_, at) => at !== index))}
          >
            <Trash2 aria-hidden className="mbc:h-4 mbc:w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={disabled}
        className="mbc:w-fit"
        onClick={() => onChange([...items, ''])}
      >
        <Plus aria-hidden />
        {t.addItem}
      </Button>
    </div>
  )
}
