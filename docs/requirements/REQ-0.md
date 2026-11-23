# REQ-0 — Baseline requirements (Corpora Editor)

> This is the baseline requirements document. New requirements are added as
> `REQ-1.md`, `REQ-2.md`, … in this folder, one file per requirement/feature,
> edited by hand as the plugin evolves. Update the status in this file as work
> lands; `REQ-N.md` files capture *proposals*, not necessarily done work.

## Functional requirements (current state)

| # | Requirement | Status |
|---|---|---|
| 1 | Left-sidebar **Corpora** panel (beside Plugins / Automation tasks). | ✅ |
| 2 | Free file explorer in the panel's right bar: lists any folder via a persistent terminal (`ls -1p`), `↑`/`⌂` navigation, independent of the session workspace. | ✅ |
| 3 | Edit / Preview modes with a mode switch. | ✅ |
| 4 | Auto-detected file-type label (Markdown, JSON, CSV, XML, plain text) with syntax highlighting; renderers are an extensible registry. | ✅ |
| 5 | Save edits to disk (terminal write, base64-chunked, exit-status checked). | ✅ |
| 6 | Docs in `docs/` plus this `requirements/` folder. | ✅ |
| 7 | Read-only binary preview: `.pdf` files render in the browser's built-in viewer and raster images (PNG, JPEG, GIF, WebP, BMP, ICO, AVIF) render inline; Edit and Save are disabled for them. | ✅ |
| 8 | Remember the last working directory: the file tree restores the last-browsed directory on re-entry (browser `localStorage`) and falls back to the session home if that path is gone. | ✅ |

## Non-functional requirements

- **Security:** no `dangerouslySetInnerHTML`; link/image URLs restricted to
  `http(s)://`, `mailto:`, `#`, and root-relative paths.
- **Extensibility:** a new text renderer is one `FILE_TYPES` entry (`render`);
  a new binary type is a `binary: true` + `kind` entry plus a view branch (PDF
  and images are the references). The editor shell, mode switch, and save path
  are decoupled from renderers.
- **Localization:** 8 locales for runtime strings and display metadata
  (en, es, zh, ja, fr, de, ru, pt).
- **Robustness:** Remote calls check `result.ok`; save verifies exit status;
  render errors degrade to a message; the panel is wrapped in an error boundary.
- **Zero build step:** plain JavaScript, no npm dependencies.

## Constraints (imposed by DSH)

1. **No client file-write Remote** — saving runs through the terminal controller.
2. **No client API lists files in arbitrary folders** — the file explorer lists
   directories through a persistent terminal shell (`ls -1p`); `workspaceFiles.list`
   is workspace-scoped and `directoryPicker.list` lists directories only.
3. **Terminal `attach` streams are single-consumer** — hold one iterator per shell.
4. **PTY canonical-mode line limit (~4096 bytes)** — save chunks base64.
5. **Static bundles can't use `host.call`/`harness.handle`** or import Harness
   packages — only `require('react')`; a proper write/list Remote needs the
   Typert build tooling.
6. **`main` panels are root-scoped** (no `sessionId` prop) — the session comes
   from `ctx.sidebarRight.mounted` with a `useSessions` fallback.

## Roadmap (not implemented)

- More renderers (YAML, TOML, TSV, and more binary types such as audio/video) —
  one `FILE_TYPES` entry each (text) or a `binary: true` + `kind` entry plus a
  view branch.
- A true Markdown editor (live split preview) instead of the plain textarea.
- Replace the terminal-based read/write with a proper Host Remote (needs build tooling).
- Unsaved-changes confirmation when switching files.
- Syntax highlighting in Edit mode.

## Convention for `REQ-N.md`

Each future requirement file should state, at minimum:

- **Summary** — one line.
- **Motivation** — why.
- **Acceptance criteria** — checkable outcomes.
- **Design notes / constraints** — anything DSH-specific.
- **Status** — proposed / in-progress / done / blocked.
