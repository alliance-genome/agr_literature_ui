# System-Status Banner (SCRUM-6071)

**Date:** 2026-06-03
**Ticket:** SCRUM-6071
**Status:** Approved design — ready for implementation plan

## Problem

Curators want advance warning when the system will be slow or when something
notable is happening (maintenance, degraded performance, etc.) so they are not
surprised by system load. Developers need to be able to publish and update that
warning **without rebuilding or redeploying the UI**, across four deployment
contexts: prod, stage, dev, and developers working locally.

## Acceptance Criteria (from ticket)

- A banner that displays the contents of an externally-controlled file so any
  developer can update it.
- Banner shows on top of (above) the header. Color is up to the developers.
- Banner does not show if the source file is empty.

## Decisions

| Decision | Choice |
| --- | --- |
| Where banner content lives | **Same-origin file**, served by the UI's own web server, kept **outside the build artifact** so it is editable without a rebuild. |
| Content format | Small JSON: `{ "message": string, "severity": "info" \| "warning" \| "danger" }`. `severity` drives the Bootstrap `Alert` color ("color up to devs", per message). |
| Dismissable? | **No.** Always visible while the file has a non-empty `message` (matches the existing version-update banner behavior). |
| Per-environment | Each environment serves its own banner file, so prod/stage/dev/local messages are independent. |

### Why same-origin instead of the ABC file server

The ABC file server (`REACT_APP_ABC_FILE_BASE_URL`) was evaluated and rejected:

- A browser `fetch()` to `https://abc-prod.alliancegenome.org/banner/banner.json`
  returns **502 Bad Gateway** (no `/banner/` location exists there today) **and**
  is **blocked by CORS** (`Access-Control-Allow-Origin` header missing). Verified
  via `curl -H "Origin: ..."` and confirmed in a real browser console.
- Using it would require another team to (a) create a real, editable `/banner/`
  location and (b) add CORS headers — both on a host this repo cannot touch or
  test. That adds a cross-team dependency and a second point of failure for a
  low-stakes status banner.
- The existing `Reports.js` only *links* (`<a href>`) to the ABC host, which never
  triggers CORS; a JS `fetch` would, which is why that host has never needed CORS.

Same-origin keeps the entire feature buildable, testable, and shippable from this
repo with no cross-team dependency and no CORS.

## Architecture

The mechanism mirrors the existing, proven version-check pattern
(`src/hooks/useVersionCheck.js` + `src/components/VersionUpdateBanner.js`, rendered
in `src/components/AppWithRouterAccess.js`).

### Critical principle: content lives outside the build

`Dockerfile` copies `build/` → `/var/www`, so anything in `public/` is **frozen
into the image** until the next build (this is exactly why `version.json` cannot
be reused as-is for an editable banner). Therefore the banner file must be
delivered **at run time**, not build time. It is treated as **server-side
deployment config**, exactly like the existing `.env` files (which are
per-server, gitignored, and supplied at run time — never baked into the image).

### Files involved

There are two distinct banner files in two different places. Only the local one
is ever in the working tree:

| File | Purpose | In git? | In build? | Origin |
| --- | --- | --- | --- | --- |
| `banner/banner.json` (mount source) | The real prod/stage/dev banner | No (gitignored) | No | Created once per server, edited in place |
| `public/banner.json` | Local-dev testing only | No (gitignored) | No | Optionally created on a developer's laptop |
| `banner/banner.json.example` | Self-documenting template + setup aid | **Yes** | No | Committed |

### Component / data flow

```
banner file (server-side config, mounted)         public/banner.json (local only)
            │                                                  │
        nginx serves /banner.json                  webpack dev server serves /banner.json
            └──────────────────────┬───────────────────────────┘
                                    │  fetch('/banner.json?t=...')  (same-origin)
                          src/hooks/useSystemBanner.js
                          (mount / tab-focus / poll interval)
                                    │ returns { message, severity } | null
                          src/components/SystemBanner.js
                          (<Alert variant={severity}>, full-width, not dismissable)
                                    │ rendered above NavigationBar
                          src/components/AppWithRouterAccess.js
```

## Component Details

### 1. `src/hooks/useSystemBanner.js` (new)

Modeled directly on `useVersionCheck.js`.

- Fetches `/banner.json?t=<cache-bust>` on: initial mount, tab visibility change
  (`visibilitychange` → visible), and a periodic interval.
- Reuse the same cadence constants as `useVersionCheck`
  (`MIN_CHECK_INTERVAL_MS = 60_000`, `POLL_INTERVAL_MS = 5 * 60_000`) for
  consistency.
- Parsing is wrapped in `try/catch`; **any** of the following yields "no banner"
  (returns `null`): network error, non-OK status (404), HTML response
  (local dev `historyApiFallback` returns `index.html` when the file is absent —
  `JSON.parse` fails harmless), empty file, malformed JSON, missing/blank
  `message`.
- `severity` is validated against `{info, warning, danger}`; anything else (or
  absent) falls back to a default of `info`.
- Returns `{ message, severity }` or `null`.

### 2. `src/components/SystemBanner.js` (new)

- Props: `message`, `severity`.
- Renders `<Alert variant={severity} className="text-center mb-0" style={{ borderRadius: 0, zIndex: 1050 }}>{message}</Alert>`
  — same visual treatment as `VersionUpdateBanner` (full-width, square corners,
  no bottom margin so it stacks cleanly).
- Not dismissable.

### 3. `src/components/AppWithRouterAccess.js` (edit)

- Call `useSystemBanner()`.
- Render above `NavigationBar`, alongside the existing version banner:
  ```jsx
  {systemBanner && <SystemBanner message={systemBanner.message} severity={systemBanner.severity} />}
  {updateAvailable && <VersionUpdateBanner />}
  ```

### 4. `nginx.conf` (edit)

Add a `location` block mirroring the existing `version.json` no-cache block, with
`try_files $uri =404` so an unmounted file simply 404s (→ no banner):

```nginx
location = /banner.json {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
    try_files $uri =404;
}
```

### 5. `docker-compose.yml` (edit)

Add a read-only bind mount so the server-side file is served at `/banner.json`:

```yaml
  ui:
    ...
    volumes:
      - ./banner/banner.json:/var/www/banner.json:ro
```

Note: the source file **must exist before `docker-compose up`**, otherwise Docker
creates an empty *directory* at that path. The per-server setup step (below)
ensures this.

### 6. `banner/banner.json.example` (new, committed)

```json
{ "message": "", "severity": "info" }
```

A `message` of `""` means "no banner", so a freshly-copied example is safe/silent
by default.

### 7. `.gitignore` (edit)

Add:
```
/banner/banner.json
/public/banner.json
```

## Update / Operations Model

- **Update without rebuild:** Yes. nginx reads the mounted file from disk on every
  request, so editing `banner/banner.json` on the server publishes the change on
  the next client poll (mount / tab-focus / ≤ poll interval). No rebuild, no
  redeploy, no container restart.
- **Where a developer edits it:** on each UI server's host, in the deploy
  directory (requires server/file access — same access already needed to place
  `.env` and run `make restart-ui`). Each environment is edited independently.
- **Propagation is eventually-consistent:** open browser tabs pick up changes on
  their next poll/tab-focus/refresh (no websockets — appropriate for a status
  banner).
- **Per-server one-time setup:** copy `banner/banner.json.example` to
  `banner/banner.json` (same one-time chore as placing the `.env` file).

## Local Development

- No file server to install. `react-scripts`/webpack-dev-server already serves
  `public/` at `/`, so `fetch('/banner.json')` is served by the dev server the
  developer is already running for `npm start`.
- To test a banner locally: create `public/banner.json` (gitignored). It is served
  live from disk; **refresh the page** (or blur/refocus the tab) to see changes —
  editing `public/` does **not** trigger Fast Refresh, and the hook only re-fetches
  on mount/tab-focus/poll.
- A developer who does nothing sees no banner (absent file → dev server returns
  `index.html` → `JSON.parse` fails → no banner; fails safe).

## Testing

- **`useSystemBanner` unit tests** (mock `fetch`): non-empty valid JSON → returns
  `{message, severity}`; empty file → `null`; malformed JSON → `null`; HTML body
  (local-dev absent-file case) → `null`; 404 → `null`; missing/blank `message` →
  `null`; invalid `severity` → defaults to `info`; network error → `null`.
- **`SystemBanner` render test:** renders message text; applies the variant
  matching `severity`.
- **`AppWithRouterAccess`:** banner renders above `NavigationBar` when the hook
  returns content; nothing renders when it returns `null`.
- Follow existing `*.test.js` + React Testing Library conventions.

## Out of Scope (YAGNI)

- Dismiss/acknowledge UI and dismissal persistence.
- Per-MOD or per-role targeting of banner content.
- A backend endpoint or admin UI for editing the banner (would remove the
  server-access requirement, but adds backend work; revisit only if "edit without
  server access" becomes a hard requirement).
- Rich text / HTML / multiple simultaneous banners.
- Real-time push (websockets); eventually-consistent polling is sufficient.

## Repo's Contribution vs. Server-Side Config

The repo provides only the **plumbing**: the `docker-compose` mount line, the
`nginx` location block, the `.example` template, the `.gitignore` entries, and the
frontend code (hook + component + wiring). The banner **content** is server-side
config, never flowing through git or the build — which is precisely what allows
updates without rebuilding.
