import type { ChangeEvent } from 'react'

/** Reads the chosen file as UTF-8 text, then clears the input so the same file can be chosen again. */
export function readJsonFile(
  event: ChangeEvent<HTMLInputElement>,
  onText: (text: string) => void
) {
  const input = event.currentTarget
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') onText(reader.result)
    input.value = ''
  }
  reader.onerror = () => {
    input.value = ''
  }
  reader.readAsText(file, 'UTF-8')
}

/** Saves the text as a JSON file through a temporary link. */
export function downloadJson(text: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'application/json' })
  )
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
