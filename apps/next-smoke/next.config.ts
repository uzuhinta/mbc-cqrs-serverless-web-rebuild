import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import type { NextConfig } from 'next'

const here = dirname(fileURLToPath(import.meta.url))

const config: NextConfig = {
  // The packages are symlinked from the workspace root.
  turbopack: { root: join(here, '../..') },
}

export default config
