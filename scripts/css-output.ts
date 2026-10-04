import postcss, { type AtRule, type Node, type Root, type Rule } from 'postcss'
import selectorParser from 'postcss-selector-parser'

export function parseCss(css: string): Root {
  return postcss.parse(css)
}

function isInside(node: Node, test: (parent: AtRule) => boolean): boolean {
  let parent = node.parent
  while (parent && parent.type !== 'root') {
    if (parent.type === 'atrule' && test(parent as AtRule)) return true
    parent = parent.parent
  }
  return false
}

const inKeyframes = (node: Node) =>
  isInside(node, (atRule) => /keyframes$/i.test(atRule.name))

const inPropertiesLayer = (node: Node) =>
  isInside(
    node,
    (atRule) => atRule.name === 'layer' && atRule.params.trim() === 'properties'
  )

function classesOf(selector: string): string[] {
  const classes: string[] = []
  selectorParser((selectors) => {
    selectors.walkClasses((node) => {
      classes.push(node.value)
    })
  }).processSync(selector)
  return classes
}

export function layerNames(root: Root): string[] {
  const names: string[] = []
  root.walkAtRules('layer', (atRule) => {
    if (atRule.nodes) names.push(atRule.params.trim())
  })
  return names
}

export function unprefixedClasses(
  root: Root,
  allowed: readonly string[] = ['dark']
): string[] {
  const found = new Set<string>()
  root.walkRules((rule: Rule) => {
    if (inKeyframes(rule)) return
    for (const name of classesOf(rule.selector)) {
      if (!name.startsWith('mbc:') && !allowed.includes(name)) found.add(name)
    }
  })
  return [...found]
}

const SCOPED_PREFIXES = [':where(', ':root', ':host']

function isScoped(selector: string): boolean {
  const trimmed = selector.trim()
  if (SCOPED_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) return true
  return classesOf(trimmed).some((name) => name.startsWith('mbc:'))
}

export function elementOnlyRules(root: Root): string[] {
  const offenders: string[] = []
  root.walkRules((rule: Rule) => {
    if (inKeyframes(rule) || inPropertiesLayer(rule)) return
    if (!rule.selectors.every(isScoped)) offenders.push(rule.selector)
  })
  return offenders
}

export function topLevelOutsideLayer(
  root: Root,
  layerPrefix: string
): string[] {
  const offenders: string[] = []
  for (const node of root.nodes) {
    if (node.type === 'comment') continue
    if (node.type === 'atrule') {
      const params = node.params.trim()
      if (node.name === 'property') continue
      if (node.name === 'layer' && !node.nodes) continue
      if (
        node.name === 'layer' &&
        (params === 'properties' ||
          params === layerPrefix ||
          params.startsWith(`${layerPrefix}.`))
      ) {
        continue
      }
      offenders.push(`@${node.name} ${params}`.trim())
      continue
    }
    offenders.push(node.type === 'rule' ? `rule ${node.selector}` : node.type)
  }
  return offenders
}
