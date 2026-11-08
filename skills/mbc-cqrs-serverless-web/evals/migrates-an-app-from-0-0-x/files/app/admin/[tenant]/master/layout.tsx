'use client'
import axios from 'axios'
import { fetchAuthSession } from 'aws-amplify/auth'
import dynamic from 'next/dynamic'
import { useParams } from 'next/navigation'
import { useMemo, type ReactNode } from 'react'

import { MasterUrlProvider } from './url-provider'

const AppProviders = dynamic(
  () =>
    import('@mbc-cqrs-serverless/master-web/AppProviders').then(
      (mod) => mod.AppProviders
    ),
  { ssr: false }
)

export default function MasterLayout({ children }: { children: ReactNode }) {
  const { tenant } = useParams<{ tenant: string }>()
  const httpClient = useMemo(() => {
    const instance = axios.create({
      baseURL: `${process.env.NEXT_PUBLIC_API_ENDPOINT}/api`,
      headers: { 'x-tenant-code': tenant },
    })
    instance.interceptors.request.use(async (config) => {
      const session = await fetchAuthSession()
      config.headers.Authorization = `Bearer ${session.tokens?.idToken}`
      return config
    })
    return instance
  }, [tenant])
  return (
    <AppProviders
      user={{ tenantCode: tenant, tenantRole: 'admin' }}
      urlProvider={new MasterUrlProvider(tenant)}
      httpClient={httpClient}
    >
      {children}
    </AppProviders>
  )
}
