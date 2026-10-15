# Lineage

The company brain that knows *why*, *who*, and *what went stale*.

Lineage is a knowledge graph over a company's decisions — ADRs, tickets, PRs,
Slack threads, systems and people — that answers questions you can't get from
search or a wiki:

- **Why** was a decision made? (traced to the thread and the people who made it)
- **What breaks** if it changes? (downstream impact, with owners)
- **Who** should I ask? (ranked by who actually touched the thing)
- **What's stale?** (everything downstream of a superseded decision, with a reason)

Its defining rule: **every answer shows the path it came from. No path, no
answer.** A claim the graph can't ground is returned as "I don't know", not
guessed.

The full product specification lives in `docs/Agent.md`.

## This repo

This is the **frontend** (Next.js 16 App Router, React 19, Tailwind v4). It runs
fully against a bundled synthetic dataset out of the box, and switches to the
real backend by setting one environment variable.

### Pages

| Route | What it does |
|---|---|
| `/` | **Ask** — question input, streamed agent trace, grounded answer with linked citations, animated evidence graph and source panel (with the exact Cypher). |
| `/review` | **Review queue** — proposed supersessions and contradictions. Accept to mark the old decision superseded and everything downstream stale, with a reason and drafted update tasks. Includes an ingest panel. |
| `/risk` | **Risk** — bus-factor-of-one systems and an offboarding simulator that ranks successors from the graph. |

### Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. No backend or database is required — the app runs on
the demo dataset in `lib/demo-data.ts`.

### Backend switch

```bash
# .env.local
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

With `NEXT_PUBLIC_API_BASE` set, every call in `lib/api.ts` goes to the FastAPI
service instead of the demo emulation. The request/response types are the same
(the contracts are in `lib/types.ts`, mirrored from the spec). You can confirm
which mode the app is in from the badge in the header stats strip.

## Architecture

```
app/            routes (Ask / Review / Risk) + layout shell + brand tokens
components/     ui/ primitives, graph-view, and one *-experience per page
lib/
  types.ts      wire contracts (spec sections 5 and 7.4)
  api.ts        one client, two backends (demo emulation | live API)
  demo-data.ts  synthetic "Northstar Pay" graph + query helpers
  utils.ts      cn()
app/globals.css brand tokens (palette "Graphite", light + dark)
brand.md        the brand: palette, type, gradients, tone
```

The graph renders with [cytoscape](https://js.cytoscape.org/) + the `fcose`
layout, imported client-side only. Everything is themed from CSS variables, so
light and dark share one stylesheet.

## Accessibility

- Full keyboard support, visible focus rings, skip link.
- The graph has a keyboard-accessible node list alongside it (canvas isn't
  focusable), and status is always icon + word + color, never color alone.
- `prefers-reduced-motion` disables the path animation, shimmer and spinner.
- Labels + types on every input, `aria-live` on results/proposals.

## Scripts

```bash
npm run dev        # develop
npm run build      # production build
npm run start      # serve the build
npm run lint       # eslint
npm run typecheck  # tsc --noEmit
```

## Notes

- The audit advisories reported by `npm audit` are dev-only, transitive via
  `eslint-config-next` (`braces`/`fast-glob`); they are not in the runtime
  bundle.
- All demo data is fictional.
