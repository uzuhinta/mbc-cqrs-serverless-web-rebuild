'use client'

import { createContext, useContext, type ReactNode } from 'react'

import type { MbcClient } from '../client'

const MbcClientContext = createContext<MbcClient | null>(null)

export function MbcClientProvider({
  client,
  children,
}: {
  client: MbcClient
  children?: ReactNode
}) {
  return (
    <MbcClientContext.Provider value={client}>
      {children}
    </MbcClientContext.Provider>
  )
}

export function useMbcClient(): MbcClient {
  const client = useContext(MbcClientContext)
  if (!client)
    throw new Error('useMbcClient must be used inside <MbcClientProvider>')
  return client
}
