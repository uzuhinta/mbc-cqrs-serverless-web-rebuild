import type { ComponentType, ReactNode } from 'react'

/** A screen the package links to. Ids are decoded (`pk#sk`); the host encodes them in its URLs. */
export type MasterTarget =
  | { screen: 'settings' }
  | { screen: 'newSetting' }
  | { screen: 'setting'; id: string }
  | { screen: 'data'; settingId: string }
  | { screen: 'newData'; settingId: string }
  | { screen: 'dataItem'; settingId: string; id: string }
  | { screen: 'copyRequest'; settingId: string }
  | { screen: 'copyTasks'; settingId: string }
  | { screen: 'copyTask'; settingId: string; taskId: string }

/** How the host's router reaches each screen; the package has no routing of its own. */
export type MasterRouting = {
  /** A real URL, so links can be opened in a new tab. */
  href(target: MasterTarget): string
  /** Go somewhere after an action (save, delete, cancel) or a plain link click. */
  navigate(target: MasterTarget): void
  /** The router's link component (e.g. next/link); without it, plain anchors call `navigate`. */
  Link?: ComponentType<{
    href: string
    className?: string
    children: ReactNode
  }>
}
