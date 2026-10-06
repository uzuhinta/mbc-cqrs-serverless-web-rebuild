'use client'

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  useHydrated,
  useLocale,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { FileText, Layers } from 'lucide-react'
import { memo } from 'react'

import { templateMessages } from './i18n/template-messages'
import type { SurveyTemplateSummary } from './types'

function formatCreated(iso: string | undefined, locale: string): string | null {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ja-JP', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
}

/** v0's SurveyCard. The date shows after hydration (it depends on the browser's time zone). */
export const SurveyTemplateCard = memo(function SurveyTemplateCard({
  item,
  onSelect,
}: {
  item: SurveyTemplateSummary
  onSelect: (item: SurveyTemplateSummary) => void
}) {
  const t = useMessages(templateMessages)
  const locale = useLocale()
  const hydrated = useHydrated()
  const created = hydrated ? formatCreated(item.createdAt, locale) : null
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={t.list.open({ name: item.name })}
      onClick={() => onSelect(item)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(item)
        }
      }}
      className="mbc:from-background mbc:to-muted/20 mbc:hover:border-primary/20 mbc:group mbc:cursor-pointer mbc:border-2 mbc:bg-linear-to-br mbc:transition-all mbc:duration-300 mbc:hover:scale-[1.02] mbc:hover:shadow-lg"
    >
      <CardHeader className="mbc:pb-4">
        <div className="mbc:flex mbc:flex-col mbc:gap-2">
          <CardTitle className="mbc:group-hover:text-primary mbc:line-clamp-2 mbc:text-lg mbc:font-semibold mbc:transition-colors mbc:sm:text-xl">
            {item.name}
          </CardTitle>
          <CardDescription className="mbc:line-clamp-2 mbc:text-sm mbc:sm:text-base">
            {item.description || t.list.noDescription}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="mbc:pt-0">
        <div className="mbc:flex mbc:flex-col mbc:gap-3">
          <div className="mbc:flex mbc:flex-col mbc:gap-2 mbc:sm:flex-row mbc:sm:items-center mbc:sm:justify-between">
            <div className="mbc:flex mbc:flex-wrap mbc:items-center mbc:gap-3 mbc:sm:gap-4">
              <div className="mbc:text-muted-foreground mbc:flex mbc:items-center mbc:gap-1.5">
                <FileText
                  aria-hidden
                  className="mbc:text-primary mbc:h-4 mbc:w-4"
                />
                <span className="mbc:text-sm mbc:font-medium">
                  {t.list.questions({ count: item.questionCount ?? 0 })}
                </span>
              </div>
              <div className="mbc:text-muted-foreground mbc:flex mbc:items-center mbc:gap-1.5">
                <Layers
                  aria-hidden
                  className="mbc:text-primary mbc:h-4 mbc:w-4"
                />
                <span className="mbc:text-sm mbc:font-medium">
                  {t.list.sections({ count: item.sectionCount ?? 0 })}
                </span>
              </div>
            </div>
            {created && (
              <Badge
                variant="secondary"
                className="mbc:border-primary/20 mbc:bg-primary/10 mbc:text-primary mbc:px-2 mbc:py-1 mbc:text-xs mbc:font-medium"
              >
                {created}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
