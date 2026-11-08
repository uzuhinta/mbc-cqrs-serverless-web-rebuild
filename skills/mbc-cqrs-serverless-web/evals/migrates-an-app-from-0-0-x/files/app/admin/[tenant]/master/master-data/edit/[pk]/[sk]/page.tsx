'use client'
import dynamic from 'next/dynamic'

const EditMasterData = dynamic(
  () => import('@mbc-cqrs-serverless/master-web/EditMasterData'),
  { ssr: false }
)

// URL: /admin/<tenant>/master/master-data/edit/<pk>/<sk>?typeCodeId=<setting id>
export default function Page() {
  return <EditMasterData />
}
