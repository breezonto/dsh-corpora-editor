# AGENTS.md

> Shared context for AI agents and any base model working on this repository.
> Read this first; the files in `docs/` hold the full details.

## What this is

**Corpora Editor** is a DeepSeek Harness (DSH) plugin that adds a "Corpora"
conversation view (a top-bar tab beside Chat and Trajectory) for editing and
previewing text-encoded files. It edits the file currently open in the built-in
right-sidebar **Files** tab, with Edit/Preview modes, a file-type dropdown, and
save-to-disk.

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
6. **There is no observable for "which sidebar tab is focused".** File selection
   is read via `ctx.sidebarRight.active()` (synchronous) plus `openTabs`/`mounted`
   subscriptions, plus a short poll to catch focus-only switches.
7. **Remote calls never throw** on Host errors; they resolve to
   `{ ok: true, value } | { ok: false, error }`. Always check `result.ok`.

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
| `docs/REQUIREMENTS.md` | Requirements, constraints, roadmap. |
| `docs/WIKI.md` | FAQ, troubleshooting, glossary. |

## Extension cheatsheet

- **Add a file type (JSON/XML/CSV):** add one entry to `FILE_TYPES` in
  `client.js` (`{ id, label, match(name), render(text) }`). The editor shell,
  mode switch, and save logic need no changes.
- **Add a toolbar action / mode:** edit `CorporaView`'s header (`ce-controls`)
  and its state. Keep state as React `useState`/`useRef`; the module already
  holds `remote` and `sidebarRight` service references set in `apply`.
- **After any `client.js`/`package.json` change:** `plugin_manager`
  `set_plugin` with `target: 'include:corpora-editor'`, `enabled: true` to
  recompose; verify with `cordis_inspect` `Slots.listSubTree`
  `{ root: 'conversation.view' }` (expect an `active` `corpora` occupant).
