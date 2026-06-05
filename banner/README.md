# System-Status Banner

Controls the warning banner shown at the top of the UI (above the navigation
header) — used to warn curators about maintenance, slowness, or other system
events.

## How it works

The UI polls the **same-origin** file `/banner.json` (on page load, on tab
focus, and every 5 minutes). The banner is shown only while that file contains a
non-empty `message`. The file is **not** part of the build — it is supplied at
run time as a mounted volume — so updating it requires **no rebuild or redeploy**.

`docker-compose.yml` mounts a *directory* of banner content read-only into nginx
at `/var/www/banner-config`, and nginx serves `/banner.json` from
`banner-config/banner.json` via `alias`. A directory (rather than a single file)
is mounted so that host edits — including `vim`/`sed` save-by-rename — are picked
up live, with no container restart. The mounted directory is the `BANNER_DIR`
variable from the env file (the one passed via `ENV_FILE=`), falling back to
`./banner` when unset.

File format:

```json
{ "message": "Scheduled maintenance 8–9pm ET; the system may be slow.", "severity": "warning" }
```

- `message`: text to show. Empty string (or missing file) → **no banner**.
- `severity`: `info` | `warning` | `danger` (drives the banner color). Anything
  else defaults to `info`.

## Per-server setup (once)

On deployed servers the docker-compose working directory is a **disposable
Jenkins workspace**, so the banner content must live outside it — in a stable,
server-managed directory (alongside how `.env` is handled). Set it up once per
server:

```bash
# 1. Create the banner directory + file in a stable location (survives redeploys):
mkdir -p /usr/share/agr_ui_files
echo '{ "message": "", "severity": "info" }' > /usr/share/agr_ui_files/banner.json

# 2. Point the mount at that DIRECTORY via BANNER_DIR in the server's env file
#    (e.g. /usr/share/agr_env_files/.env.dev_3001):
BANNER_DIR=/usr/share/agr_ui_files

# 3. Redeploy so the container binds the directory:
make restart-ui ENV_FILE=/usr/share/agr_env_files/.env.dev_3001
```

The directory must exist before `docker-compose up`. `banner.json` need not
exist yet — if it's absent nginx returns 404 and the UI simply shows no banner;
create it whenever you want a banner. Leaving `BANNER_DIR` unset falls back to
`./banner` (only suitable for local Docker use, not a deployed server).

To let anyone on the server edit the banner, make the directory and file
writable as needed (e.g. `chmod 777 /usr/share/agr_ui_files` and `chmod 666
/usr/share/agr_ui_files/banner.json`).

## Updating the banner

Edit `banner.json` in the `BANNER_DIR` (e.g. `/usr/share/agr_ui_files/banner.json`)
on the server — including with `vim`. Because a *directory* is mounted, the edit
is picked up live; open browser tabs reflect it on their next poll/tab-focus/refresh,
with no rebuild, redeploy, or container restart. To clear the banner, set
`message` to `""` (or remove the file).

## Local development

`npm start`'s dev server serves `public/` at `/`, so to test a banner locally
create `public/banner.json` (gitignored) with the same format. Refresh the page
to see changes (editing `public/` does not trigger hot-reload).
