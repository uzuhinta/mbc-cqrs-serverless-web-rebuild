import type { Locale } from '@mbc-cqrs-serverless/ui-web'
import { Button } from '@mbc-cqrs-serverless/ui-web'

export type Settings = { locale: Locale; dark: boolean }

export function Toolbar({
  settings,
  onChange,
}: {
  settings: Settings
  onChange: (next: Settings) => void
}) {
  return (
    <div style={{ display: 'flex', gap: 8, padding: 16, flexWrap: 'wrap' }}>
      <Button
        variant="outline"
        onClick={() =>
          onChange({
            ...settings,
            locale: settings.locale === 'ja' ? 'en' : 'ja',
          })
        }
      >
        {settings.locale === 'ja' ? 'English' : '日本語'}
      </Button>
      <Button
        variant="outline"
        onClick={() => onChange({ ...settings, dark: !settings.dark })}
      >
        {settings.dark ? 'Light' : 'Dark'}
      </Button>
      <a
        href={settings.dark ? '/v3-preflight.html?dark' : '/v3-preflight.html'}
      >
        Tailwind v3 preflight fixture
      </a>
      <a href="#">Gallery</a>
      <a href="#survey">Survey form</a>
      <a href="#creator">Survey creator</a>
      <a href="#templates">Templates</a>
    </div>
  )
}
