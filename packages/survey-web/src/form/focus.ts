const FOCUSABLE =
  'input:not([disabled]), textarea:not([disabled]), button:not([disabled]), [role="radio"]:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Focuses the first invalid question's control inside `root`. */
export function focusFirstInvalid(root: HTMLElement | null): void {
  const card = root?.querySelector<HTMLElement>(
    '[data-question-id][data-invalid]'
  )
  if (!card) return
  const invalid = card.querySelector<HTMLElement>('[aria-invalid="true"]')
  const target =
    invalid && invalid.matches(FOCUSABLE)
      ? invalid
      : card.querySelector<HTMLElement>(FOCUSABLE)
  target?.focus()
}
