# Corpora Editor — Requirements

## Functional requirements

| # | Requirement | Status |
|---|---|---|
| 1 | Renamed plugin to "Corpora Editor"; edits any text-encoded file. | ✅ |
| 2 | Edit / Preview modes with a mode switch (VSCode-style editing). | ✅ |
| 3 | Select files from the built-in right-sidebar **Files** tab (no redundant in-view tree). | ✅ |
| 4 | Extensible file-type dropdown (Markdown + Plain text now; JSON/XML/CSV later). | ✅ |
| 5 | Save edits to disk. | ✅ (via terminal) |
| 6 | `README.md` and `docs/` with architecture, dev guide, requirements, wiki. | ✅ |

## Non-functional requirements

- **Security:** no `dangerouslySetInnerHTML`; link/image URLs restricted to
  `http(s)://`, `mailto:`, `#`, and root-relative paths (no `javascript:`).
- **Extensibility:** new renderers are one `FILE_TYPES` entry; the editor shell
  and save path are decoupled from renderers.
- **Localization:** 8 locales for both client runtime strings and display
  metadata (en, es, zh, ja, fr, de, ru, pt).
- **Robustness:** Remote calls check `result.ok`; save detects write failures
  via exit status; renderer errors degrade to a message instead of crashing.
- **Zero build step:** plain JavaScript, no npm dependencies.

## Constraints (imposed by DSH)

These are not bugs — they are properties of the DSH extension model:

1. **No client file-write Remote.** `workspaceFiles` is read-only. Saving runs
   through the terminal controller, so a brief terminal flashes on Save.
2. **PTY canonical-mode line limit (~4096 bytes).** Save chunks base64.
3. **`workspaceFiles.list` rejects `''`.** The root is `'.'`.
4. **Static bundles can't use `host.call` or import Harness packages.** Only
   `require('react')`; a proper write Remote would need the Typert build
   tooling (not available to a plain bundle).
5. **`conversation.view` mounts only the active view** and there is **no
   observable for focus-only tab switches**, so file selection polls `active()`.

## Roadmap (not implemented)

- JSON, XML, CSV renderers (the registry is ready).
- A true Markdown editor (the current Edit mode is a plain textarea; a live
  split preview is possible within the same view).
- Replace the terminal-based save with a proper Host write Remote if one is
  added to DSH, or via a plugin-provided write service.
- Unsaved-changes confirmation when switching files.
- Syntax highlighting in Edit mode.
