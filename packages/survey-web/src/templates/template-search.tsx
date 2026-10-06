'use client'

import { cn, Input, useMessages } from '@mbc-cqrs-serverless/ui-web'
import { useEffect, useRef, useState } from 'react'

import { templateMessages } from './i18n/template-messages'

/** v0's SearchInput without nuqs: reports the keyword after `delay` ms of quiet. */
export function TemplateSearch({
  value,
  onChange,
  delay = 300,
  className,
}: {
  value: string
  onChange: (keyword: string) => void
  delay?: number
  className?: string
}) {
  const t = useMessages(templateMessages)
  const [draft, setDraft] = useState(value)
  const [given, setGiven] = useState(value)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // A new value from the host replaces the draft (React's "adjust state on prop change").
  if (value !== given) {
    setGiven(value)
    setDraft(value)
  }

  useEffect(() => {
    if (draft === value) return
    const timer = setTimeout(() => onChangeRef.current(draft), delay)
    return () => clearTimeout(timer)
  }, [draft, value, delay])

  return (
    <Input
      type="search"
      aria-label={t.list.searchPlaceholder}
      placeholder={t.list.searchPlaceholder}
      showSearchIcon
      className={cn(
        'mbc:rounded-full mbc:border mbc:border-[#636F80] mbc:bg-white mbc:placeholder:text-[#B7BDC6]',
        className
      )}
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
    />
  )
}
