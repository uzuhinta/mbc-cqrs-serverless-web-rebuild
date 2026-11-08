import { useEffect, useRef, type RefObject } from 'react'

// A control a person can reach: Radix's switches, checkboxes and selects are
// buttons with a role, beside hidden native inputs (aria-hidden, tabindex -1).
const REACHABLE =
  ':not([disabled]):not([aria-hidden="true"]):not([tabindex="-1"])'
const FIELD = [
  'input:not([type="hidden"])',
  'textarea',
  'select',
  '[role="switch"]',
  '[role="checkbox"]',
  '[role="combobox"]',
  '[role="textbox"]',
  '[contenteditable="true"]',
]
  .map((selector) => `${selector}${REACHABLE}`)
  .join(', ')

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
