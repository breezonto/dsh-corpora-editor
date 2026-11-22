# AGENTS.md

> Shared context for AI agents and any base model working on this repository.
> Read this first; the files in `docs/` hold the full details.

## What this is

**Corpora Editor** is a DeepSeek Harness (DSH) plugin that adds a **Corpora**
panel to the left sidebar (beside Plugins and Automation tasks) for editing and
previewing text-encoded files. It has a free file explorer in the panel's right
bar (browse any folder via a terminal shell), with Edit/Preview modes, a
file-type label, and save-to-disk.

## Critical DSH constraints (do not re-learn these the hard way)

These facts cost a lot of investigation to establish and are easy to get wrong:

1. **There is no client-accessible file-WRITE Remote.** `workspaceFiles` is
   read-only (`readBytes`, `list`, `stat`, `read`, `search`, `changes`). The
   only way the browser half can write an arbitrary workspace file is through
   the **terminal controller** (`ctx.remote.terminal`): `create` → `attach` →
   `send` input → read output → `close`.
2. **PTY canonical mode truncates a single input line near 4096 bytes.** Save
   must chunk base64 into ≤~3800-char lines and pipe them into one `base64 -d`.
3. **`workspaceFiles.list` rejects an empty path.** The workspace root is
   addressed as `'.'`, never `''` (`gateway/bad-request: path is required`).
4. **A static bundle's client half** (`window.__ModuleLoader__.load` +
   `factory(require)`) can only `require('react')` (and the other platform
   modules). It can **not** import any `@deepseek-ai/dsh-*` package, can **not**
   use `host.call`/`harness.handle` (dynamic packages only), and can **not**
   register a Typert Remote namespace without the build tooling.
5. **`conversation.view` renders only the active view** (one at a time). Its
   `openView` prop only exists while that view is mounted, so you cannot switch
   conversation views from outside this slot.
6. **No client API lists files in arbitrary folders.** `workspaceFiles.list` is
   workspace-scoped (root `'.'`, rejects outside-workspace) and
   `directoryPicker.list` lists directories only. The panel's file explorer
   therefore lists directories via a **persistent terminal shell**
   (`ls -1p --color=never`), which can browse any folder the OS user can read;
   a short-lived terminal appears in the session's terminal list while it runs.
7. **Remote calls never throw** on Host errors; they resolve to
   `{ ok: true, value } | { ok: false, error }`. Always check `result.ok`.
8. **Guard nullable state in effects.** File selection and the on-screen
   session can be `null`/`undefined` transiently, so a value read from them can
   become `null` while a previous read is still `'ready'`. Guard `!= null`
   before dereferencing, and wrap the panel in an error boundary so one error
   never blanks it.

## Where things live

| File | Purpose |
|---|---|
| `client.js` | Entire browser half: editor UI, file read/save, file-type registry. |
| `index.js` | Empty host half (`export function apply() {}`). |
| `cordis.patch.yml` | Loader patch that inserts the plugin row. |
| `package.json` | Manifest (`dsh.bundle` + `dsh.client` + `engines.dsh`). |
| `locale/*.json` | Display metadata (`meta.title` / `meta.description`). |
| `docs/ARCHITECTURE.md` | Components, data flow, extension points. |
| `docs/DEVELOPMENT.md` | Setup, debug loop, extension recipes. |
| `docs/requirements/REQ-0.md` | Baseline requirements; `REQ-N.md` files here are the change log / feature proposals. |
| `docs/WIKI.md` | FAQ, troubleshooting, glossary. |

## Extension cheatsheet

- **Add a file type (JSON/XML/CSV):** add one entry to `FILE_TYPES` in
  `client.js` (`{ id, label, match(name), render(text) }`). The editor shell,
  mode switch, and save logic need no changes.
- **Add a toolbar action / mode:** edit `CorporaPage`'s header (`ce-controls`)
  and its state. Keep state as React `useState`/`useRef`; the module already
  holds `remote` and `sidebarRight` service references set in `apply`.
- **After any `client.js`/`package.json` change:** `plugin_manager`
  `set_plugin` with `target: 'include:corpora-editor'`, `enabled: true` to
  recompose; verify with `cordis_inspect` `Slots.listSubTree`
  `{ root: 'sidebar.panellist' }` (expect an `active` `corpora` occupant, order
  5) and `{ root: 'main' }` (expect an `active` `corpora` key).
