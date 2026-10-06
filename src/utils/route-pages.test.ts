import { describe, expect, it } from 'vitest'

import html from '../../index.html?raw'
import { catalog } from '@/data/catalog'
import { renderRoutePage, routeMeta } from '@/utils/route-pages'
import { sitemapPaths } from '@/utils/sitemap'

const notes = [{ domainId: 'devops', id: 'Ansible', title: 'Ansible Fundamentals' }]
const routes = routeMeta(catalog, notes)

describe('routeMeta', () => {
  it('covers every sitemap path except the homepage, which keeps index.html as is', () => {
    const expected = sitemapPaths(catalog, notes).filter((path) => path !== '/')
    expect(routes.map((route) => route.path)).toEqual(expect.arrayContaining(expected))
    expect(routes).toHaveLength(expected.length)
  })

  it('names a note page after its heading', () => {
    const note = routes.find((route) => route.path === '/notes/devops/Ansible')
    expect(note?.title).toBe('Ansible Fundamentals - Scribe Cards Notes')
  })
})

describe('renderRoutePage', () => {
  // `html` is the real index.html, so a reformatted tag fails here rather than in the deploy.
  const route = { path: '/courses/aws/clf-c02', title: 'AWS "CLF" & more', description: 'A <b> test' }
  const page = renderRoutePage(html, 'https://example.com', '/', route)

  it('rewrites the title, description and URL tags, escaped', () => {
    expect(page).toContain('<title>AWS &quot;CLF&quot; &amp; more</title>')
    expect(page).toContain('<meta property="og:title" content="AWS &quot;CLF&quot; &amp; more" />')
    expect(page).toContain('<meta name="twitter:description" content="A &lt;b&gt; test" />')
    expect(page).toContain('<meta property="og:url" content="https://example.com/courses/aws/clf-c02" />')
    expect(page).toContain('<link rel="canonical" href="https://example.com/courses/aws/clf-c02" />')
  })

  it('keeps the shared preview image', () => {
    expect(page).toContain('<meta property="og:image" content="https://flashcards.codescribes.io/og-image.png" />')
  })

  it('refuses a page it cannot rewrite', () => {
    expect(() => renderRoutePage('<html></html>', 'https://example.com', '/', route)).toThrow()
  })
})
