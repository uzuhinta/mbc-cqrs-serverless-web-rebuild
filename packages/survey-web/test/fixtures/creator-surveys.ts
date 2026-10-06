import type { Survey } from '../../src/schema/survey-schema'

/**
 * 0 sec_locked (locked) · 1 q_in_locked · 2 sec_open · 3 q_open ·
 * 4 q_locked (locked) · 5 sec_last · 6 q_last (branches to sec_open)
 */
export const LOCKS: Survey = {
  title: 'Locks',
  items: [
    { id: 'sec_locked', type: 'section-header', title: 'Locked', locked: true },
    { id: 'q_in_locked', type: 'short-text', label: 'In locked' },
    { id: 'sec_open', type: 'section-header', title: 'Open' },
    { id: 'q_open', type: 'short-text', label: 'Open question' },
    {
      id: 'q_locked',
      type: 'short-text',
      label: 'Locked question',
      locked: true,
    },
    { id: 'sec_last', type: 'section-header', title: 'Last' },
    {
      id: 'q_last',
      type: 'single-choice',
      label: 'Pick',
      options: [{ value: 'A', label: 'A', nextSectionId: 'sec_open' }],
    },
  ],
}

/** A locked section that is not the first one. */
export const LOCKED_SECOND: Survey = {
  title: 'Second locked',
  items: [
    { id: 'sec_a', type: 'section-header', title: 'A' },
    { id: 'q_a', type: 'short-text', label: 'QA' },
    { id: 'sec_b', type: 'section-header', title: 'B', locked: true },
    { id: 'q_b', type: 'short-text', label: 'QB' },
    { id: 'sec_c', type: 'section-header', title: 'C' },
  ],
}
