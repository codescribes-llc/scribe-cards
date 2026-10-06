// Relative, not `@/types/cards`: `scripts/write-route-pages.ts` imports this module and
// the node tsconfig has no path alias.
import type { Catalog } from '../types/cards'
import type { SitemapNote } from './sitemap'

/**
 * Per-route link-preview metadata. Slack, LinkedIn and X read the HTML a URL returns and
 * never run the app, so a title set in React is invisible to them. The build writes one
 * HTML file per route with these values baked in instead.
 *
 * Writing a real file per route also means GitHub Pages answers those URLs with 200
 * rather than the 404 the SPA fallback carries, and preview crawlers drop a 404.
 */

/** A note as the router identifies it, plus the title from its first `#` heading. */
export interface RouteNote extends SitemapNote {
  title: string
}

export interface RouteMeta {
  path: string
  title: string
  description: string
}

const SITE = 'Scribe Cards'

export function routeMeta(catalog: Catalog, notes: RouteNote[]): RouteMeta[] {
  const routes: RouteMeta[] = [
    {
      path: '/courses',
      title: `Courses - ${SITE}`,
      description: 'Every certification course on Scribe Cards, each quizzed with flashcards drawn from hand-written study notes.',
    },
    {
      path: '/notes',
      title: `Study Notes - ${SITE}`,
      description: 'The hand-written certification study notes every Scribe Cards flashcard is grounded in.',
    },
  ]

  for (const domain of catalog.domains) {
    if (domain.status !== 'available') continue
    routes.push({
      path: `/${domain.id}`,
      title: `${domain.title} Flashcards - ${SITE}`,
      description: domain.description,
    })
  }

  for (const course of catalog.courses) {
    const name = course.subtitle ? `${course.title} (${course.subtitle})` : course.title
    routes.push({
      path: `/courses/${course.path}`,
      title: `${name} Flashcards - ${SITE}`,
      description: course.description,
    })
  }

  for (const note of notes) {
    routes.push({
      path: `/notes/${note.domainId}/${note.id}`,
      title: `${note.title} - ${SITE} Notes`,
      description: `Hand-written study notes on ${note.title}, with the flashcards that cite them.`,
    })
  }

  return routes
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Rewrites the built `index.html` for one route. Each pattern must match exactly once:
 * a silent miss would ship every page with the homepage's preview, so it throws instead.
 */
export function renderRoutePage(html: string, origin: string, base: string, route: RouteMeta): string {
  const url = `${origin}${base.replace(/\/$/, '')}${route.path}`
  const title = escapeAttr(route.title)
  const description = escapeAttr(route.description)

  const replacements: [RegExp, string][] = [
    [/<title>[^<]*<\/title>/, `<title>${title}</title>`],
    [/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${description}" />`],
    [/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`],
    [/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${title}" />`],
    [/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${description}" />`],
    [/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`],
    [/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${title}" />`],
    [/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${description}" />`],
  ]

  return replacements.reduce((page, [pattern, replacement]) => {
    if (!pattern.test(page)) throw new Error(`index.html has no tag matching ${pattern}`)
    // A function, so a `$` in a course description is not read as a replacement pattern.
    return page.replace(pattern, () => replacement)
  }, html)
}
