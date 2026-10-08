'use client'

/** v0's red asterisk after a required input's label; the input itself says `aria-required`. */
export function RequiredMark() {
  return (
    <span aria-hidden className="mbc:text-destructive mbc:ml-1">
      *
    </span>
  )
}
