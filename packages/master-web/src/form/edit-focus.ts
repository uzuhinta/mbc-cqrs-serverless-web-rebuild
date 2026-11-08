import { useEffect, useRef, type RefObject } from 'react'

const FIELD =
  'input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled])'

/**
 * Edit replaces the focused Edit button: `start()` remembers to move focus
 * to the form's first editable field once editing has rendered.
 */
export function useEditFocus(
  editing: boolean,
  form: RefObject<HTMLFormElement | null>
) {
  const pending = useRef(false)
  useEffect(() => {
    if (!editing || !pending.current) return
    pending.current = false
    form.current?.querySelector<HTMLElement>(FIELD)?.focus()
  }, [editing, form])
  return {
    start: () => {
      pending.current = true
    },
  }
}
