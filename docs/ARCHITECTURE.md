# Corpora Editor — Architecture

## Overview

Corpora Editor is a DSH **bundle**: a package whose `package.json` declares
`dsh.bundle.patch` and `dsh.client`. It has a trivial Host half and a
self-contained browser half.

```
browser (client.js)                      Host process
┌─────────────────────────────┐          ┌────────────────────────┐
│ sidebar.panellist "corpora" │          │ workspaceFiles Remote   (read) │
│ main "corpora"              │          │ terminal Remote  (list+write) │
│   CorporaPage (React)       │── read ─▶│                               │
│   ├─ useCurrentSession      │          └───────────────────────────────┘
│   ├─ FileTree (shell ls)    │
│   ├─ useFileText            │
│   └─ saveFile               │
└─────────────────────────────┘
```

## Components (all in `client.js`)

1. **`FILE_TYPES` registry** — the extension point for renderers. Each entry:
   `{ id, label, match(name), render(text) }`. `detectFileType(name)` picks the
   first matching entry; the UI shows the detected type as a label.
2. **`useCurrentSession()`** — reads the on-screen Session via
   `ctx.sidebarRight.mounted`, with a `useSessions` fallback to the first listed
   session (the panel is root-scoped, so it has no `sessionId` prop of its own).
3. **`FileTree(sessionId, selectedPath, onSelect)`** — the panel's right-bar
   file explorer. Lists the current directory via a **persistent terminal shell**
   (`ls -1p --color=never`) so it can browse any folder, with `↑`/`⌂`
   navigation; clicking a file calls `onSelect(absolutePath)`.
4. **`useFileText(sessionId, path)`** — reads a file's bytes via
   `remote.workspaceFiles.readBytes`, decodes UTF-8, and returns
   `{ status, text, absolutePath }`. `absolutePath` is the value used on save
   (robust against cwd differences).
5. **`saveFile(sessionId, absolutePath, content)`** — writes via the terminal
   controller. Content is base64-encoded and chunked (PTY line limit), piped
   into `base64 -d > <path>`, and a trailing sentinel carries the exit status so
   failures are detected.
6. **`CorporaPage`** — the React component registered into the root-scoped
   `main` slot (key `corpora`), addressed by the `sidebar.panellist` entry.
   Owns editor state (`draft`, `savedText`, `mode`, `typeId`, `saving`,
   `saveError`) and renders the header (title, mode toggle, file-type label,
   Save button) and the body (textarea or rendered preview).

## Data flow

```
FileTree: click a file (absolute path)
   └─▶ CorporaPage sets selectedPath
        └─▶ useFileText readBytes  →  { text, absolutePath }
             └─▶ CorporaPage draft = text
                  ├─ Edit:    <textarea> edits draft
                  ├─ Preview: FILE_TYPES[typeId].render(draft)
                  └─ Save:    saveFile(absolutePath, draft) via terminal
```

## DSH APIs used

| API | Use |
|---|---|
| `sidebar.panellist` slot | Registers the left-sidebar panel icon (id `corpora`, order 5). |
| `main` slot | Registers the panel page (key `corpora`). |
| `ctx.remote.workspaceFiles.readBytes(sessionId, path, {}, signal)` | Read a file (absolute or workspace-relative). |
| `ctx.remote.terminal.create/attach/close` | List folders (shell `ls`) and save files. |
| `ctx.sidebarRight.mounted` | The on-screen session (fallback: `useSessions`). |
| `ctx.locale.register` / slot `locale` | Localized labels + `t`. |

## Service `inject`

```js
inject: ['slots', 'locale', 'remote', 'remote.workspaceFiles', 'remote.terminal', 'sidebarRight']
```

## Extension points

- **New file type:** add a `FILE_TYPES` entry. No other code changes.
- **New toolbar control:** edit the `ce-controls` block in `CorporaPage`.
- **New mode:** add a value to `mode` state and a branch in the body render.
- **Better save:** replace `saveFile`'s terminal backend (or add a proper write
  Remote if one becomes available) without touching the view.

## Constraints and their implications

- **No client file-write Remote** → save runs through a short-lived terminal.
- **No client API lists files in arbitrary folders** → the file explorer uses a
  persistent terminal shell (`ls -1p`).
- **Terminal `attach` streams are single-consumer** → one persistent iterator
  per shell.
- **Static bundle module table** → only `require('react')`; no Harness imports.
- **PTY 4096-byte line limit** → save chunks base64.
- **Remote results never throw** → every call checks `result.ok`.
