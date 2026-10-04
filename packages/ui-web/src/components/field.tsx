'use client'

import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type AriaAttributes,
  type HTMLAttributes,
  type ReactNode,
} from 'react'

import { cn } from '../lib/cn'
import { Label, type LabelProps } from './label'

type FieldContextValue = {
  controlId: string
  labelId: string
  descriptionId: string
  errorId: string
  invalid: boolean
  hasDescription: boolean
  hasError: boolean
  setHasDescription: (value: boolean) => void
  setHasError: (value: boolean) => void
}

const FieldContext = createContext<FieldContextValue | null>(null)

export type FieldProps = HTMLAttributes<HTMLDivElement> & { invalid?: boolean }

export const Field = forwardRef<HTMLDivElement, FieldProps>(function Field(
  { className, invalid = false, ...props },
  ref
) {
  const id = useId()
  const [hasDescription, setHasDescription] = useState(false)
  const [hasError, setHasError] = useState(false)
  const value = useMemo<FieldContextValue>(
    () => ({
      controlId: `${id}-control`,
      labelId: `${id}-label`,
      descriptionId: `${id}-description`,
      errorId: `${id}-error`,
      invalid,
      hasDescription,
      hasError,
      setHasDescription,
      setHasError,
    }),
    [id, invalid, hasDescription, hasError]
  )
  return (
    <FieldContext.Provider value={value}>
      <div
        ref={ref}
        data-mbc=""
        data-slot="field"
        data-invalid={invalid || undefined}
        className={cn('mbc:grid mbc:gap-2', className)}
        {...props}
      />
    </FieldContext.Provider>
  )
})

export type FieldControlProps = {
  id?: string
  'aria-describedby'?: string
  'aria-labelledby'?: string
  'aria-invalid'?: AriaAttributes['aria-invalid']
}

export function useFieldControl<P extends FieldControlProps>(
  props: P,
  options: { group?: boolean } = {}
): P {
  const field = useContext(FieldContext)
  if (!field) return props

  const describedBy =
    [
      props['aria-describedby'],
      field.hasDescription ? field.descriptionId : undefined,
      field.hasError ? field.errorId : undefined,
    ]
      .filter(Boolean)
      .join(' ') || undefined

  return {
    ...props,
    id: props.id ?? field.controlId,
    'aria-describedby': describedBy,
    'aria-invalid': props['aria-invalid'] ?? (field.invalid || undefined),
    ...(options.group
      ? { 'aria-labelledby': props['aria-labelledby'] ?? field.labelId }
      : {}),
  }
}

export const FieldLabel = forwardRef<HTMLLabelElement, LabelProps>(
  function FieldLabel(props, ref) {
    const field = useContext(FieldContext)
    return (
      <Label
        ref={ref}
        id={field?.labelId}
        {...props}
        htmlFor={props.htmlFor ?? field?.controlId}
      />
    )
  }
)

function useRegister(
  setter: ((value: boolean) => void) | undefined,
  active: boolean
) {
  useEffect(() => {
    if (!setter || !active) return
    setter(true)
    return () => setter(false)
  }, [setter, active])
}

function hasContent(children: ReactNode): boolean {
  return (
    children !== undefined &&
    children !== null &&
    children !== false &&
    children !== ''
  )
}

export const FieldDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function FieldDescription({ className, ...props }, ref) {
  const field = useContext(FieldContext)
  useRegister(field?.setHasDescription, true)
  return (
    <p
      ref={ref}
      id={field?.descriptionId}
      data-slot="field-description"
      className={cn(
        'mbc:text-sm mbc:font-normal mbc:text-[#475467]',
        className
      )}
      {...props}
    />
  )
})

export const FieldError = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(function FieldError({ className, children, ...props }, ref) {
  const field = useContext(FieldContext)
  const visible = hasContent(children)
  useRegister(field?.setHasError, visible)
  if (!visible) return null
  return (
    <p
      ref={ref}
      id={field?.errorId}
      data-slot="field-error"
      className={cn('mbc:text-destructive mbc:text-sm', className)}
      {...props}
    >
      {children}
    </p>
  )
})
