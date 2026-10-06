'use client'

import {
  Alert,
  AlertDescription,
  Button,
  cn,
  useMessages,
} from '@mbc-cqrs-serverless/ui-web'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
} from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'

import type { SurveyAnswerMeta, SurveyAnswers } from '../answers/types'
import { collectAnswers } from '../engine/collect'
import { resolveNext } from '../engine/navigation'
import { buildPages } from '../engine/pages'
import { surveyMessages } from '../i18n/survey-messages'
import {
  questionRenderers,
  type QuestionRenderers,
} from '../question-types/registry'
import type { QuestionRendererProps } from '../question-types/types'
import { normalizeSurvey } from '../schema/parse'
import type { SurveyInput } from '../schema/survey-schema'
import { focusFirstInvalid } from './focus'
import { QuestionField } from './question-field'
import { createSectionResolver } from './resolver'

export type SurveyFormProps = {
  /** Parsed here, so stored JSON without defaults is fine. */
  schema: SurveyInput
  onSubmit: (
    answers: SurveyAnswers,
    meta: SurveyAnswerMeta[]
  ) => void | Promise<void>
  onSubmitError?: (error: unknown) => void
  /** Read once on mount: render after the answer has loaded, or remount with `key`. */
  defaultValues?: SurveyAnswers
  disabled?: boolean
  submitLabel?: ReactNode
  children?: ReactNode
  onSectionChange?: (sectionId: string) => void
  components?: Partial<QuestionRenderers>
  className?: string
}

type Status = 'idle' | 'submitting' | 'failed'

export function SurveyForm({
  schema,
  onSubmit,
  onSubmitError,
  defaultValues,
  disabled = false,
  submitLabel,
  children,
  onSectionChange,
  components,
  className,
}: SurveyFormProps) {
  const t = useMessages(surveyMessages)
  const survey = useMemo(() => normalizeSurvey(schema), [schema])
  const pages = useMemo(() => buildPages(survey), [survey])
  const [history, setHistory] = useState<string[]>(() =>
    pages[0] ? [pages[0].id] : []
  )
  const [status, setStatus] = useState<Status>('idle')
  const [focusRequest, setFocusRequest] = useState(0)
  const formRef = useRef<HTMLFormElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const navigated = useRef(false)

  const current = pages.find((page) => page.id === history.at(-1))
  const resolver = useMemo(
    () => createSectionResolver(current?.questions ?? [], t.validation),
    [current, t.validation]
  )
  const { control, handleSubmit, trigger, getValues } = useForm<SurveyAnswers>({
    defaultValues,
    resolver,
    // Renderers take no ref; focusFirstInvalid moves focus once the error is described.
    shouldFocusError: false,
  })

  const branchIds = useMemo(
    () =>
      (current?.questions ?? [])
        .filter((q) => q.type === 'single-choice' || q.type === 'dropdown')
        .map((q) => q.id),
    [current]
  )
  const branchValues = useWatch({ control, name: branchIds })
  const isFinal = useMemo(() => {
    if (!current) return true
    const answers = Object.fromEntries(
      branchIds.map((id, i) => [id, branchValues[i]])
    )
    return resolveNext(current, answers, pages) === null
  }, [current, branchIds, branchValues, pages])

  useEffect(() => {
    if (!navigated.current || !current) return
    headingRef.current?.focus()
    onSectionChange?.(current.id)
    // Only navigation, not callback identity, should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id])

  useEffect(() => {
    if (focusRequest === 0) return
    // FieldError registers its id one commit after it renders; focus after that.
    const timer = setTimeout(() => focusFirstInvalid(formRef.current), 0)
    return () => clearTimeout(timer)
  }, [focusRequest])

  const requestFocus = () => setFocusRequest((n) => n + 1)

  const goNext = async () => {
    if (!current) return
    const valid = await trigger(current.questions.map((q) => q.id))
    if (!valid) {
      requestFocus()
      return
    }
    const nextId = resolveNext(current, getValues(), pages)
    if (nextId) {
      navigated.current = true
      setHistory((previous) => [...previous, nextId])
    }
  }

  const goBack = () => {
    navigated.current = true
    setHistory((previous) =>
      previous.length > 1 ? previous.slice(0, -1) : previous
    )
  }

  const submit = handleSubmit(
    async (values) => {
      const { answers, meta } = collectAnswers(pages, history, values)
      setStatus('submitting')
      try {
        await onSubmit(answers, meta)
        setStatus('idle')
      } catch (error) {
        setStatus('failed')
        onSubmitError?.(error)
      }
    },
    () => requestFocus()
  )

  const onFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isFinal) void submit(event)
    else void goNext()
  }

  if (!current) {
    return (
      <div data-mbc="" className="mbc:p-8 mbc:text-center">
        {t.form.empty}
      </div>
    )
  }

  const busy = disabled || status === 'submitting'

  return (
    <form
      ref={formRef}
      data-mbc=""
      aria-label={survey.title}
      noValidate
      onSubmit={onFormSubmit}
      className={cn(
        'mbc:mx-auto mbc:my-12 mbc:max-w-3xl',
        disabled && 'mbc:pointer-events-none mbc:opacity-50',
        className
      )}
    >
      <div className="mbc:mb-10 mbc:text-center">
        <h1 className="mbc:text-4xl mbc:font-bold mbc:tracking-tight">
          {survey.title}
        </h1>
        {survey.description && (
          <p className="mbc:text-muted-foreground mbc:mt-2 mbc:text-lg">
            {survey.description}
          </p>
        )}
      </div>

      <div key={current.id} className="mbc:mt-8">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="mbc:mb-6 mbc:border-b mbc:border-border mbc:pb-2 mbc:text-2xl mbc:font-semibold mbc:outline-none"
        >
          {current.title}
        </h2>
        {current.description && (
          <p className="mbc:text-muted-foreground mbc:mb-6">
            {current.description}
          </p>
        )}
        {children}
        {current.questions.map((question) => {
          const Renderer = (components?.[question.type] ??
            questionRenderers[
              question.type
            ]) as ComponentType<QuestionRendererProps>
          return (
            <Controller
              key={question.id}
              name={question.id}
              control={control}
              render={({ field, fieldState }) => (
                <QuestionField
                  questionId={question.id}
                  label={question.label}
                  description={question.description}
                  required={question.validation?.required}
                  error={fieldState.error?.message}
                >
                  <Renderer
                    question={question}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={busy}
                    invalid={Boolean(fieldState.error)}
                  />
                </QuestionField>
              )}
            />
          )
        })}
      </div>

      {status === 'failed' && (
        <Alert variant="destructive" className="mbc:mt-8">
          <AlertDescription>{t.form.submitError}</AlertDescription>
        </Alert>
      )}

      <div className="mbc:mt-8 mbc:flex mbc:justify-between mbc:pt-4">
        <div>
          {history.length > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={busy}
            >
              {t.form.back}
            </Button>
          )}
        </div>
        {/* One submit button: it is the form's default button, so Enter in any
            field goes through onFormSubmit (Next, or Submit on the last section). */}
        <Button
          type="submit"
          disabled={busy}
          loading={status === 'submitting'}
          // The second click of a double-click on Next would land on Submit.
          onClick={(event) => {
            if (event.detail > 1) event.preventDefault()
          }}
        >
          {isFinal ? (submitLabel ?? t.form.submit) : t.form.next}
        </Button>
      </div>
    </form>
  )
}
