import type { MbcRealtimeError } from '../errors'
import {
  ON_MESSAGE,
  parseMessage,
  readMessage,
  type MbcMessage,
  type MessageFilter,
} from '../messages'
import { eventsChannel, matchesFilter } from './channel'
import type { RealtimeClient } from './client'
import type { Subscription } from './connection'
import type { EventsClient } from './events'

export type MessageHandlers = {
  next: (message: MbcMessage) => void
  error?: (error: MbcRealtimeError) => void
}

/** The backend's notifications, whichever real-time transport carries them. */
export type MessageStream = {
  readonly transport: 'graphql' | 'events'
  subscribe(filter: MessageFilter, handlers: MessageHandlers): Subscription
  close(): void
}

/** Notifications from the AppSync GraphQL `onMessage` subscription. */
export function graphqlMessages(realtime: RealtimeClient): MessageStream {
  return {
    transport: 'graphql',
    subscribe(filter, handlers) {
      return realtime.subscribe(
        { query: ON_MESSAGE, variables: filter },
        {
          next: (payload) => {
            const message = parseMessage(payload)
            if (message) handlers.next(message)
          },
          error: handlers.error,
        }
      )
    },
    close: () => realtime.close(),
  }
}

/**
 * Notifications from AppSync Events channels. `namespace` must match the
 * backend's `APPSYNC_EVENTS_NAMESPACE` (default `default`).
 */
export function eventsMessages(
  events: EventsClient,
  namespace = 'default'
): MessageStream {
  return {
    transport: 'events',
    subscribe(filter, handlers) {
      return events.subscribe(eventsChannel(namespace, filter), {
        next: (event) => {
          const message = readMessage(event)
          if (message && matchesFilter(message, filter)) handlers.next(message)
        },
        error: handlers.error,
      })
    },
    close: () => events.close(),
  }
}

export function isMessageStream(
  value: RealtimeClient | MessageStream
): value is MessageStream {
  return 'transport' in value
}
