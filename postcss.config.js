import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'

// MUI 6 injects unlayered styles. Keep the established v3 cascade so that
// Tailwind utilities and theme styles retain their existing precedence.
const preserveCascade = {
  postcssPlugin: 'preserve-existing-cascade',
  OnceExit(root) {
    const layers = new Map(['properties', 'theme', 'base', 'components', 'utilities'].map(name => [name, []]))
    for (const node of [...root.nodes]) {
      if (node.type !== 'atrule' || node.name !== 'layer') continue
      if (node.nodes) {
        if (!layers.has(node.params)) throw new Error(`Unexpected CSS layer: ${node.params}`)
        layers.get(node.params).push(...node.nodes)
      }
      node.remove()
    }
    root.prepend(...[...layers.values()].flat())
    // v4 otherwise inherits --tw-leading from headings even when a text-size
    // utility should supply its own line height, changing the existing cards.
    root.walkDecls('line-height', declaration => {
      const match = /^var\(--tw-leading, (var\(--text-[^)]+\))\)$/.exec(declaration.value)
      if (match) declaration.value = match[1]
    })
  },
}

export default { plugins: [tailwindcss(), autoprefixer(), preserveCascade] }
