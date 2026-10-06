import type { Announcements } from '@dnd-kit/core'

import type { CreatorMessages } from './i18n/creator-messages'

/** dnd-kit's live-region text, translated; `label` names an item by id. */
export function announcements(
  t: CreatorMessages,
  label: (id: string) => string
): Announcements {
  const name = (id: string | number) => label(String(id))
  return {
    onDragStart: ({ active }) => t.dnd.pickedUp({ label: name(active.id) }),
    onDragOver: ({ active, over }) =>
      over
        ? t.dnd.movedOver({ label: name(active.id), over: name(over.id) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t.dnd.dropped({ label: name(active.id), over: name(over.id) })
        : t.dnd.droppedNowhere({ label: name(active.id) }),
    onDragCancel: ({ active }) => t.dnd.cancelled({ label: name(active.id) }),
  }
}
