---
name: run-desktop
description: Build, run, and drive the KPI Studio Electron desktop app. Use when asked to start the desktop app, take a screenshot of it, or interact with its UI.
---

KPI Studio is an Electron + React + TypeScript desktop app (see [package.json](../../../package.json)). For agent/automated use, drive it via the Playwright REPL at `driver.mjs` in this folder — no xvfb needed, this runs on macOS with a real display.

All paths below are relative to the project root (`/Users/sultanbekkenzhakhimov/Desktop/kpi-studio`).

## Build

```bash
npm run build   # typecheck + electron-vite build -> out/main, out/preload, out/renderer
```

The driver launches the **built** app (`out/main/index.js`, per `package.json`'s `"main"`), not `npm run dev`'s HMR server — rebuild after changing source before driving it.

## Run (human path)

```bash
npm run dev   # HMR dev server + live window
```

## Run (agent path)

No `tmux` on this machine, so drive the REPL by piping commands in rather than `send-keys`. One command per line; wait for its output before sending the next (the REPL processes lines as fast as they arrive, so overlapping commands can race — safest is one `node -e` / heredoc per command when timing matters, or a properly awaited batch script like `scripts/e2e-smoke.mjs`).

```bash
node .claude/skills/run-desktop/driver.mjs <<'EOF'
launch
ss dashboard
windows
quit
EOF
```

Screenshots land in `/tmp/kpi-studio-shots/` (override: `SCREENSHOT_DIR`).

### Commands

| command | what it does |
|---|---|
| `launch` | launch the built app, wait for the window |
| `ss [name]` | screenshot -> `/tmp/kpi-studio-shots/<name>.png` |
| `click <css-sel>` | click element (DOM `.click()`, not coordinates) |
| `click-text <text>` | click button/link/row containing text |
| `type <text>` / `press <key>` | keyboard input |
| `wait <css-sel>` | wait for element, 10s timeout |
| `eval <js>` | evaluate expression in the page, print JSON |
| `text [css-sel]` | print innerText |
| `windows` | list all windows |
| `quit` | close app, exit |

## The native file-picker problem

Step 1 of the import wizard opens a native OS `dialog.showOpenDialog` — Playwright cannot drive that. To exercise the import pipeline (Excel parsing, column-mapping normalization, DB commit) without it, call `window.api.*` directly via `eval`, exactly as the wizard's own code does once a file is chosen — see `scripts/e2e-smoke.mjs` for a full worked example (loads `fixtures/samsung_kz_media_plan_sample.xlsx`, builds the columnMap by hand matching that fixture's header row, and runs `importPreview` + `importCommit`). Re-run it any time with:

```bash
npm run test:e2e
```

## Gotchas

- **`firstWindow()` is the real UI here** — this app has exactly one `BrowserWindow`, no splash screen, no BrowserView layering.
- **Electron steals stdin** — the driver reads `/dev/stdin` directly via `fs.createReadStream`, so don't remove that trick if you edit it.
- **The dashboard only fetches on mount.** Setting `window.location.hash` to the route it's *already* on does not remount `DashboardPage`, so its `useEffect` data-fetch won't re-run — navigate to a different route first, or relaunch the app, to see freshly-committed data reflected.
- **A previous `test:e2e` run leaves real rows in the local SQLite DB** (`~/Library/Application Support/kpi-studio/kpi-studio.db` on macOS) — it's fixture data under campaign "Galaxy S26 Launch", harmless, but expect it to still be there on the next launch.
