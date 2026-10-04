import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

export const REACT_VERSIONS = {
  '18': {
    react: '18.3.1',
    'react-dom': '18.3.1',
    '@types/react': '18.3.31',
    '@types/react-dom': '18.3.7',
  },
  '19': {
    react: '19.3.0',
    'react-dom': '19.3.0',
    '@types/react': '19.3.0',
    '@types/react-dom': '19.3.0',
  },
} as const

export type ReactMajor = keyof typeof REACT_VERSIONS

export type PackageJson = {
  pnpm?: { overrides?: Record<string, string> }
  [key: string]: unknown
}

export function isReactMajor(value: string | undefined): value is ReactMajor {
  return value === '18' || value === '19'
}

export function applyReactVersion(
  pkg: PackageJson,
  major: ReactMajor
): PackageJson {
  return {
    ...pkg,
    pnpm: {
      ...pkg.pnpm,
      overrides: { ...pkg.pnpm?.overrides, ...REACT_VERSIONS[major] },
    },
  }
}

function main(): void {
  const major = process.argv[2]
  if (!isReactMajor(major)) {
    process.stderr.write('Usage: pnpm use-react <18|19>\n')
    process.exit(1)
  }

  const packageJsonPath = fileURLToPath(
    new URL('../package.json', import.meta.url)
  )
  const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson
  writeFileSync(
    packageJsonPath,
    `${JSON.stringify(applyReactVersion(pkg, major), null, 2)}\n`
  )

  execFileSync('pnpm', ['install', '--no-frozen-lockfile'], {
    stdio: 'inherit',
  })
  process.stdout.write(`Workspace now uses React ${major}.\n`)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
