'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { MbcClient } from '../client'
import { useMbcClient } from './provider'

export type CommandStatus = 'idle' | 'sending' | 'waiting' | 'done' | 'error'

export type CommandContext = {
  client: MbcClient
  signal: AbortSignal
  onPhase: (phase: 'sending' | 'waiting') => void
}

type State<R> = { status: CommandStatus; data: R | undefined; error: unknown }

const IDLE = { status: 'idle', data: undefined, error: undefined } as const

export function useCommand<A extends unknown[], R>(
  fn: (context: CommandContext, ...args: A) => Promise<R>
) {
  const client = useMbcClient()
  const [state, setState] = useState<State<R>>(IDLE)
  const fnRef = useRef(fn)
  const controllerRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(false)

  useEffect(() => {
    fnRef.current = fn
  })

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      controllerRef.current?.abort()
    }
  }, [])

  const run = useCallback(
    async (...args: A): Promise<R | undefined> => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const update = (next: State<R>) => {
        if (mountedRef.current && controllerRef.current === controller)
          setState(next)
      }

      update({ status: 'sending', data: undefined, error: undefined })
      try {
        const data = await fnRef.current(
          {
            client,
            signal: controller.signal,
            onPhase: (phase) =>
              update({ status: phase, data: undefined, error: undefined }),
          },
          ...args
        )
        if (controller.signal.aborted) return undefined
        update({ status: 'done', data, error: undefined })
        return data
      } catch (error) {
        if (controller.signal.aborted) return undefined
        update({ status: 'error', data: undefined, error })
        return undefined
      }
    },
    [client]
  )

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    controllerRef.current = null
    setState(IDLE)
  }, [])

  return { ...state, run, reset }
}
