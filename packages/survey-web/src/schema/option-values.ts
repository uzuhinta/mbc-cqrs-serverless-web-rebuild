/** Why an option's value breaks the rules; internal, not part of the public schema. */
export type OptionValueProblem = 'duplicate' | 'empty' | 'reserved'

const isReserved = (option: { value: string; isOther?: boolean }) =>
  !option.isOther &&
  (option.value === 'other' || option.value.startsWith('other:'))

/**
 * Option values identify answers, so they are non-empty and unique within a
 * question, and `other` / `other:<text>` are reserved for the "Other" option
 * (v0 0.0.49). One entry per option; `undefined` means the value is fine. A
 * reserved value is reported as such and does not count towards duplicates,
 * so the error lands on the option that misuses it, never on the fixed
 * "Other" option.
 */
export function optionValueProblems(
  options: readonly { value: string; isOther?: boolean }[]
): (OptionValueProblem | undefined)[] {
  const seen = new Set<string>()
  return options.map((option) => {
    if (isReserved(option)) return 'reserved'
    const problem = seen.has(option.value)
      ? 'duplicate'
      : option.value === ''
        ? 'empty'
        : undefined
    seen.add(option.value)
    return problem
  })
}
