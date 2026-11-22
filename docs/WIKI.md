# Corpora Editor — Wiki

## FAQ

**Why does a terminal flash when I click Save?**
DSH exposes no client-side file-write API, so the editor writes through the
terminal controller (the only client-accessible write path). The terminal is
created, runs a shell command, and is closed immediately.

**Why is the Corpora view empty?**
Open a text/Markdown file in the right sidebar's **Files** tab first; the Corpora
view mirrors whichever file is open there. If you're on a non-file tab (the
Files tree itself, a plan, subagents…), the view shows the empty hint.

**Does it work with non-Markdown files?**
Yes — any UTF-8 text file loads in Edit mode. Preview uses the selected
renderer: Markdown for `.md`/`.markdown`, "Plain text" (monospace) otherwise.
The file-type dropdown overrides auto-detection.

**Is saving safe?**
The save writes via `base64 -d` and reports the command's exit status, so a
failed write (permission, missing directory) surfaces an error rather than
silently succeeding.

## Known limitations

- Save opens a brief terminal (see above).
- Files over ~32 MiB are refused by the read endpoint (`maxFileBytes`).
- Unsaved edits are discarded when you switch to a different file.
- The editor is a plain textarea (no syntax highlighting yet).
- Focus-only tab switches in the sidebar are detected by a 500 ms poll (no
  public observable exists for them).

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Corpora tab missing | Plugin not enabled, or the client half didn't reload. Re-enable the row and hard-refresh the page. |
| "Could not read this file" | File is binary/large/unreadable. Pick a text file from the tree. |
| Save does nothing | Save is disabled until there are unsaved edits (`draft ≠ savedText`). |
| Save error "save failed (exit status …)" | The path is unwritable or the directory is missing. Check the file location. |
| Save error "save timed out" | The terminal didn't produce the completion sentinel in 30 s (unusual shell/startup). Retry. |

## Glossary

- **Bundle** — a DSH plugin package (`package.json` with `dsh.bundle.patch`).
- **Host half** — `index.js`, runs in the Node host process (empty here).
- **Client half / browser half** — `client.js`, runs in the Web page.
- **Remote** — DSH's typed Host↔Client RPC (`ctx.remote.<namespace>`).
- **Slot** — a named extension point (`sidebar.panellist`, `main`, …) a plugin renders into.
- **`sidebar.panellist`** — the left-sidebar panel list (icon + label); each id addresses the matching `main` panel.
- **`main`** — the root-scoped central panel slot (keyed by panel id).
- **`workspaceFiles`** — read-only Remote for file reads/listing/search/change feed.
- **`terminal`** — Remote for creating/attaching terminals (used here to list folders and write files).
- **`sidebarRight`** — service exposing the on-screen session (`mounted`) and active tab.
- **`FILE_TYPES`** — this plugin's renderer registry.
