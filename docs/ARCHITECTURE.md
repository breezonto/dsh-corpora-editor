# Corpora Editor — Architecture

## Overview

Corpora Editor is a DSH **bundle**: a package whose `package.json` declares
`dsh.bundle.patch` and `dsh.client`. It has a trivial Host half and a
self-contained browser half.

```
browser (client.js)                      Host process
┌─────────────────────────────┐          ┌────────────────────────┐
│ conversation.view "corpora" │          │ workspaceFiles Remote  │ (read-only)
│   CorporaView (React)       │── read ─▶│ terminal Remote        │ (write)
│   ├─ useActiveFile          │          └────────────────────────┘
│   ├─ useFileText            │
│   └─ saveFile               │
└─────────────────────────────┘
```

## Components (all in `client.js`)

1. **`FILE_TYPES` registry** — the extension point for renderers. Each entry:
   `{ id, label, match(name), render(text) }`. `detectFileType(name)` picks the
   first matching entry; the UI dropdown lets the user override it.
2. **`useActiveFile()`** — observes the file open in the right sidebar's
   built-in Files tab. Reads `ctx.sidebarRight.active()`, parses the
   `TabRecord.contentId` (`dsh-resource://file/…`) into a workspace-relative
   path, and re-reads on `openTabs`/`mounted` subscriptions plus a 500 ms poll
   (there is no observable for focus-only tab switches).
3. **`useFileText(sessionId, path)`** — reads a file's bytes via
   `remote.workspaceFiles.readBytes`, decodes UTF-8, and returns
   `{ status, text, absolutePath }`. `absolutePath` is the value used on save
   (robust against cwd differences).
4. **`saveFile(sessionId, absolutePath, content)`** — writes via the terminal
   controller. Content is base64-encoded and chunked (PTY line limit), piped
   into `base64 -d > <path>`, and a trailing sentinel carries the exit status so
   failures are detected.
5. **`CorporaView`** — the React component registered into
   `conversation.view`. Owns editor state (`draft`, `savedText`, `mode`,
   `typeId`, `saving`, `saveError`) and renders the header (title, mode toggle,
   file-type dropdown, Save button) and the body (textarea or rendered preview).

## Data flow

```
Files tab: open a file
   └─▶ sidebarRight.active().contentId  (dsh-resource://file/session/<id>/<path>)
        └─▶ useActiveFile parses path + sessionId
             └─▶ useFileText readBytes  →  { text, absolutePath }
                  └─▶ CorporaView draft = text
                       ├─ Edit:    <textarea> edits draft
                       ├─ Preview: FILE_TYPES[typeId].render(draft)
                       └─ Save:    saveFile(absolutePath, draft) via terminal
```

## DSH APIs used

| API | Use |
|---|---|
| `conversation.view` slot | Registers the Corpora view (id `corpora`, order 20). |
| `ctx.remote.workspaceFiles.readBytes(sessionId, path, {}, signal)` | Read a file. |
| `ctx.remote.workspaceFiles.list(sessionId, path, signal)` | Not used now (tree removed). |
| `ctx.remote.terminal.create/attach/close` | Save a file. |
| `ctx.sidebarRight.active()` / `.openTabs` / `.mounted` | Observe the open file. |
| `ctx.locale.register` / slot `locale` | Localized labels + `t`. |

## Service `inject`

```js
inject: ['slots', 'locale', 'remote', 'remote.workspaceFiles', 'remote.terminal', 'sidebarRight']
```

## Extension points

- **New file type:** add a `FILE_TYPES` entry. No other code changes.
- **New toolbar control:** edit the `ce-controls` block in `CorporaView`.
- **New mode:** add a value to `mode` state and a branch in the body render.
- **Better save:** replace `saveFile`'s terminal backend (or add a proper write
  Remote if one becomes available) without touching the view.

## Constraints and their implications

- **No client file-write Remote** → save runs through a short-lived terminal.
- **Static bundle module table** → only `require('react')`; no Harness imports.
- **PTY 4096-byte line limit** → save chunks base64.
- **No focus-change observable** → 500 ms poll for file selection.
- **Remote results never throw** → every call checks `result.ok`.
