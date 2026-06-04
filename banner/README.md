# System-Status Banner

Controls the warning banner shown at the top of the UI (above the navigation
header) — used to warn curators about maintenance, slowness, or other system
events.

## How it works

The UI polls the **same-origin** file `/banner.json` (on page load, on tab
focus, and every 5 minutes). The banner is shown only while that file contains a
non-empty `message`. The file is **not** part of the build — it is supplied at
run time as a mounted volume — so updating it requires **no rebuild or redeploy**.

File format:

```json
{ "message": "Scheduled maintenance 8–9pm ET; the system may be slow.", "severity": "warning" }
```

- `message`: text to show. Empty string (or missing file) → **no banner**.
- `severity`: `info` | `warning` | `danger` (drives the banner color). Anything
  else defaults to `info`.

## Per-server setup (once)

On each deployed server, in the directory where `docker-compose` runs:

```bash
cp banner/banner.json.example banner/banner.json
```

`docker-compose.yml` mounts `banner/banner.json` read-only into nginx at
`/var/www/banner.json`. The file **must exist before `docker-compose up`**,
otherwise Docker creates a directory at that path. The example starts with an
empty `message`, so nothing shows until you set one.

## Updating the banner

Edit `banner/banner.json` on the server (this file is gitignored, so deploys
never clobber it). Open browser tabs pick up the change on their next
poll/tab-focus/refresh — no rebuild, redeploy, or container restart.

To clear the banner, set `message` to `""`.

## Local development

`npm start`'s dev server serves `public/` at `/`, so to test a banner locally
create `public/banner.json` (gitignored) with the same format. Refresh the page
to see changes (editing `public/` does not trigger hot-reload).
