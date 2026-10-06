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
  // The last keyword reported to the host; its (possibly late) echo must not undo newer typing.
  const [reported, setReported] = useState<string | null>(null)
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // A new value from the host replaces the draft (React's "adjust state on prop change"),
  // unless it is the echo of what this input reported.
  if (value !== given) {
    setGiven(value)
    if (value !== reported) setDraft(value)
  }

  useEffect(() => {
    if (draft === value || draft === reported) return
    const timer = setTimeout(() => {
      setReported(draft)
      onChangeRef.current(draft)
    }, delay)
    return () => clearTimeout(timer)
  }, [draft, value, reported, delay])

  return (
    <Input
      // type="text": a search input's native clear button would cover the icon.
      type="text"
      role="searchbox"
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
