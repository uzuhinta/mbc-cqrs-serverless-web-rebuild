'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import { useId, useMemo } from 'react'

import type { SectionHeader } from '../../schema/survey-schema'
import { useItemIssues } from '../creator-ui'
import { creatorMessages } from '../i18n/creator-messages'
import { isSection } from '../state/items'
import { useCreatorSelector, useCreatorStore } from '../state/store'

const SUBMIT = '##SUBMIT##'
const CONTINUE = 'default'

/** v0's "n セクション後" row under the last item of every section but the last. */
export function SectionAction({ sectionId }: { sectionId: string }) {
  const t = useMessages(creatorMessages)
  const labelId = useId()
  const { dispatch } = useCreatorStore()
  const items = useCreatorSelector((state) => state.survey.items)
  const { warnings } = useItemIssues(sectionId)
  const headers = useMemo(() => items.filter(isSection), [items])
  const index = headers.findIndex((header) => header.id === sectionId)
  const section = headers[index]
  if (!section) return null

  const value =
    section.action?.type === 'submit'
      ? SUBMIT
      : section.action?.type === 'jump'
        ? section.action.targetSectionId
        : CONTINUE
  const setAction = (next: string) =>
    dispatch({
      type: 'updateItem',
      id: sectionId,
      update: (item) => {
        const { action: _previous, ...rest } = item as SectionHeader
        if (next === CONTINUE) return rest as SectionHeader
        return {
          ...rest,
          action:
            next === SUBMIT
              ? { type: 'submit' }
              : { type: 'jump', targetSectionId: next },
        }
      },
    })

  return (
    <div className="mbc:mt-6 mbc:pb-6">
      <div className="mbc:flex mbc:min-w-0 mbc:items-center mbc:gap-2">
        <p
          id={labelId}
          className="mbc:text-muted-foreground mbc:shrink-0 mbc:text-sm mbc:font-medium"
        >
          {t.action.after({ n: index + 1 })}
        </p>
        <Select value={value} onValueChange={setAction}>
          <SelectTrigger
            aria-labelledby={labelId}
            className="mbc:min-w-0 mbc:max-w-[300px] mbc:flex-1 mbc:overflow-hidden mbc:border-0 mbc:bg-transparent mbc:p-1 mbc:shadow-none mbc:focus:ring-0 mbc:focus:ring-offset-0"
          >
            <SelectValue
              placeholder={t.action.continueNext}
              className="mbc:block mbc:min-w-0 mbc:truncate"
            />
          </SelectTrigger>
          <SelectContent className="mbc:max-w-[380px]">
            <SelectItem value={CONTINUE}>{t.action.continueNext}</SelectItem>
            {headers.map((header, i) =>
              header.id === sectionId ? null : (
                <SelectItem key={header.id} value={header.id}>
                  {t.action.goTo({
                    n: i + 1,
                    title: header.title || t.section.untitled,
                  })}
                </SelectItem>
              )
            )}
            <SelectItem value={SUBMIT}>{t.action.submit}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {warnings.length > 0 && (
        <p className="mbc:mt-1 mbc:text-sm mbc:text-amber-700 mbc:dark:text-amber-400">
          {t.errors.missingTarget}
        </p>
      )}
    </div>
  )
}
