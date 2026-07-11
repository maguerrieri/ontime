#!/usr/bin/env node
// Agent driver for ontime: smoke the HTTP API and screenshot UI views.
// Run from repo root AFTER the server is up (see SKILL.md):
//   node .claude/skills/run-ontime/driver.mjs [command] [args]
//
// Commands:
//   smoke                  - API round-trip: version, start event 1, poll, pause, stop
//   ss <view> [out.png]    - screenshot a UI view (see KNOWN_VIEWS below)
//   poll                   - dump current runtime state
//
// PORT env selects the server port (default 4001).

import { chromium } from '@playwright/test';

const PORT = process.env.PORT ?? '4001';
const BASE = `http://localhost:${PORT}`;

async function api(path) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch (cause) {
    throw new Error(`cannot reach ${BASE} — is the server running? (see SKILL.md)`, { cause });
  }
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function smoke() {
  const version = await api('/api/version');
  console.log('version:', version.payload);
  await api('/api/start/index/1');
  try {
    const playing = await api('/api/poll');
    console.log('playback:', playing.payload.timer.playback, '| event:', playing.payload.eventNow?.title);
    if (playing.payload.timer.playback !== 'play') throw new Error('expected playback=play after start');
    await api('/api/pause');
  } finally {
    await api('/api/stop').catch(() => {}); // leave the shared server stopped even on failure
  }
  const stopped = await api('/api/poll');
  if (stopped.payload.timer.playback !== 'stop') throw new Error('expected playback=stop after stop');
  console.log('smoke OK');
}

// from apps/client/src/AppRouter.tsx; unknown paths hit a wildcard redirect and still render something
const KNOWN_VIEWS = ['timer', 'countdown', 'backstage', 'studio', 'timeline', 'info', 'editor', 'cuesheet', 'op'];

async function screenshot(view = 'timer', out = `ontime-${view}.png`) {
  if (!KNOWN_VIEWS.includes(view)) {
    console.warn(`warning: '${view}' is not a known view (${KNOWN_VIEWS.join(', ')}); screenshotting anyway`);
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    // networkidle ignores the app's WebSocket, so it settles fine (verified live)
    await page.goto(`${BASE}/${view}`, { waitUntil: 'networkidle' });
    await page.screenshot({ path: out });
    console.log(`saved ${out}`);
  } finally {
    await browser.close();
  }
}

const [cmd = 'smoke', ...args] = process.argv.slice(2);
if (cmd === 'smoke') await smoke();
else if (cmd === 'ss') await screenshot(...args);
else if (cmd === 'poll') console.log(JSON.stringify((await api('/api/poll')).payload, null, 2));
else {
  console.error(`unknown command: ${cmd}`);
  process.exit(1);
}
