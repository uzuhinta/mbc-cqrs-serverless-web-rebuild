'use client'

import type { MouseEvent, ReactNode } from 'react'

import type { MasterRouting, MasterTarget } from './routing'

/** A link to one of the package's screens through the host's routing. */
export function MasterLink({
  routing,
  to,
  className,
  children,
}: {
  routing: MasterRouting
  to: MasterTarget
  className?: string
  children: ReactNode
}) {
  const href = routing.href(to)
  if (routing.Link) {
    const { Link } = routing
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    )
  }
  const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
    // Modified and middle clicks open a new tab: leave those to the browser.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return
    event.preventDefault()
    routing.navigate(to)
  }
  return (
    <a href={href} className={className} onClick={onClick}>
      {children}
    </a>
  )
}
