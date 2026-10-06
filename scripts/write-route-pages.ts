/**
 * Writes a copy of `dist/index.html` for every indexable route, each carrying that page's
 * own title, description and URL for link previews. See `src/utils/route-pages.ts`.
 *
 * Each route is written both as `<path>.html` and `<path>/index.html`. GitHub Pages
 * resolves an extensionless URL to either, and `/notes` and `/courses` are also
 * directories, so writing both means every form of the URL lands on a real file.
 *
 * `SITE_URL` and `BASE_PATH` are read the same way `write-sitemap.ts` reads them.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import catalogJson from '../catalog.json' with { type: 'json' }
import type { Catalog } from '../src/types/cards'
import { renderRoutePage, routeMeta, type RouteNote } from '../src/utils/route-pages'

const repoRoot = resolve(fileURLToPath(new URL('../', import.meta.url)))
const dist = join(repoRoot, 'dist')
const origin = (process.env.SITE_URL ?? 'https://flashcards.codescribes.io').replace(/\/$/, '')
const base = process.env.BASE_PATH ?? '/'

/** A note's title is its first `#` heading, or its basename when it has none. */
function readNotes(): RouteNote[] {
  const notesRoot = join(repoRoot, 'notes')
  const notes: RouteNote[] = []

  for (const domainId of readdirSync(notesRoot)) {
    for (const file of readdirSync(join(notesRoot, domainId))) {
      if (!file.endsWith('.md')) continue
      const id = file.replace(/\.md$/, '')
      const heading = readFileSync(join(notesRoot, domainId, file), 'utf8').match(/^# (.+)$/m)
      const title = heading?.[1].trim() ?? id.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      notes.push({ domainId, id, title })
    }
  }

  return notes
}

const html = readFileSync(join(dist, 'index.html'), 'utf8')
const routes = routeMeta(catalogJson as unknown as Catalog, readNotes())

for (const route of routes) {
  const page = renderRoutePage(html, origin, base, route)
  for (const file of [`${route.path.slice(1)}.html`, join(route.path.slice(1), 'index.html')]) {
    const target = join(dist, file)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, page)
  }
}

console.log(`✓ wrote ${routes.length} route pages with link-preview metadata`)
