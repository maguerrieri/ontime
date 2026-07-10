---
name: run-ontime
description: Build, run, and drive ontime (event timer web app). Use when asked to start ontime, run the dev server, run unit or e2e tests, take a screenshot of a view (timer, editor, clock), or exercise the playback API.
---

Ontime is a pnpm/turbo monorepo: a Node server (`apps/server`, Express + tsx) that serves the built React UI (`apps/client`) and a REST/WebSocket API. An agent drives the **running server over HTTP** — playback via `/api/*`, screenshots via `.claude/skills/run-ontime/driver.mjs` (Playwright, already a repo dependency). No Electron needed for development.

All paths are relative to the repo root.

## Prerequisites

- Node ~22 and pnpm ~11 (`package.json` `engines`). If `pnpm` is missing, corepack provides the pinned version:

```bash
source ~/.nvm/nvm.sh   # or however node 22 gets on PATH; repo pins 22.x
corepack enable
pnpm --version         # 11.x, from the packageManager field
```

## Setup + build

```bash
pnpm i        # postinstall generates src/ONTIME_VERSION.js in client and server
pnpm build    # turbo build of all workspaces; populates apps/client/build (served by the server)
```

`pnpm build` must run at least once before the server is useful — the server serves the **built** UI from `apps/client/build` even in dev mode.

## Run (agent path)

Start the server with a pinned port and throwaway data dir — otherwise it reads `~/Library/Application Support/Ontime` (macOS) and listens on whatever port is stored there (observed: 50223, not the documented 4001):

```bash
mkdir -p /tmp/ontime-data
(cd apps/server && ONTIME_DATA=/tmp/ontime-data PORT=4001 pnpm dev) &   # background terminal
SERVER_PID=$!   # keep this to stop the server later
# ready when the log prints "Ontime is listening on port 4001"
curl -s localhost:4001/api/version   # {"payload":"<repo version>"}
```

A fresh `ONTIME_DATA` dir is auto-seeded with a demo project (6-event rundown), so there is always something to play.

Then drive it with the driver:

```bash
node .claude/skills/run-ontime/driver.mjs smoke            # version + start/pause/stop round-trip, asserts state
node .claude/skills/run-ontime/driver.mjs poll             # dump runtime state JSON
node .claude/skills/run-ontime/driver.mjs ss timer t.png   # screenshot a view: timer, editor, clock, backstage, cuesheet, op
```

Useful API endpoints (all GET, JSON `{payload: ...}`):

- `/api/version`, `/api/poll` (full runtime state)
- `/api/start/index/1` (1-based), `/api/start/next`, `/api/pause`, `/api/stop`
- `/data/settings`, `/data/db` (project data)

Stop cleanly: Ctrl-C in the server's terminal, or `kill $SERVER_PID` if you backgrounded it as above (avoid broad patterns like `pkill -f "tsx watch"` — they can hit unrelated processes).

## Run (human path)

`pnpm dev` at repo root starts server **and** the vite client dev server (HMR, port 3000). Use the vite one for iterating on client code; the agent path above is enough for API/server work and screenshots of production-ish UI.

## Test

```bash
pnpm test   # turbo test:pipeline — vitest in client, server, utils (~seconds when cached)
pnpm e2e    # builds ontime-ui, then Playwright vs the server on :4001 (57 tests, ~3 min)
```

## Gotchas

- **`pnpm e2e` reuses an existing server on 4001** (`reuseExistingServer: true` in `playwright.config.ts`). If your own dev server is already on 4001, the e2e suite runs against _it_ — your data dir, your state. Stop your server first for a clean run.
- **Port precedence:** `PORT` env > stored app state > default 4001 (`apps/server/src/classes/port-manager/PortManager.ts`). Without `ONTIME_DATA`+`PORT`, you inherit the local operator's install state.
- **UI routes 301 to trailing slash** (`/timer` → `/timer/`) — only visible when curling raw (`curl -L` or use the trailing slash); browsers and Playwright follow it transparently, so e2e specs use `/timer` unchanged.
- **Editor shows a "Welcome to Ontime" modal** on first load of a fresh data dir — screenshots of `/editor` will have it in front. Other views (timer, clock…) are unaffected.
- **`DEVELOPMENT.md` is stale:** it references `pnpm build:local` and `pnpm dev:server`, which don't exist in the root `package.json`. Use `pnpm build` and `(cd apps/server && pnpm dev)`.

## Troubleshooting

- `command not found: pnpm` — node came from a path without corepack shims. `source ~/.nvm/nvm.sh && corepack enable`.
- `/api/start` returns `{"message":"Unable to start"}` — bare `start` needs an already-loaded/selected event; use `/api/start/index/1` to start by position.
- Server came up on an unexpected port — you didn't set `PORT`; read the actual port from the "Ontime is listening on port" log line.
