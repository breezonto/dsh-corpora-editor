# Corpora Editor — Development Guide

## Requirements

- DeepSeek Harness `^0.2.3-alpha.2`.
- A running DSH profile with the Web GUI (the plugin is a browser bundle).
- No build step: the bundle is plain JavaScript files.

## Install (local bundle)

1. Put this directory somewhere on disk.
2. In DSH: **Settings → Plugins → Add plugin**, choose this directory.
3. Or via the plugin manager: `install_bundle` with the directory as `target`.

## Debug loop (fast iteration)

The bundle is a local linked install, so file changes reload without a full
restart:

1. Edit `client.js` (or `package.json`, locale files, patch).
2. Re-compose the plugin: `plugin_manager` `set_plugin`,
   `target: 'include:corpora-editor'`, `enabled: true`.
   (`application: applied` is the authoritative signal.)
3. Verify registration live: `cordis_inspect` → `Slots.listSubTree`,
   `{ root: 'sidebar.panellist' }` (expect an `active` occupant with
   `id: 'corpora'`, `order: 5`) and `{ root: 'main' }` (expect an `active`
   `corpora` key).

If the browser page has not picked up the change, hard-refresh it (client HMR
only rebuilds while the dev watcher runs).

## Manual test checklist

1. Click **Corpora** in the left sidebar.
2. In the right bar, use `↑`/`⌂` and folder rows to navigate; pick a text file.
3. Navigate into a subfolder, leave the Corpora view (open another panel), then
   return — the tree resumes in that subfolder, not the home directory.
4. Toggle **Edit**, change text, toggle **Preview** — the preview reflects edits.
5. The **file-type label** shows the auto-detected renderer.
6. Click **Save** — a brief terminal appears, then disappears; re-read the file
   to confirm the change persisted.
7. Pick a `.pdf` file: the PDF renders in the browser's viewer, the file-type
   label reads **PDF**, and the **Edit** and **Save** buttons are disabled.
8. Pick a raster image (`.png`, `.jpg`, …): the image renders inline, the
   file-type label reads **Image**, and the **Edit** and **Save** buttons are
   disabled.
9. Error paths: an unwritable file should show a save error, not a silent no-op.

## Adding a file type (JSON / XML / CSV)

1. In `client.js`, add an entry to `FILE_TYPES` **before** the catch-all
   `text` entry:

   ```js
   {
     id: 'json',
     label: 'JSON',
     match: (name) => /\.(json|jsonc)$/i.test(name),
     render: (text) => {
       let parsed;
       try { parsed = JSON.parse(text); }
       catch { return h('div', { className: 'ce-status ce-status-error' }, 'Invalid JSON'); }
       return h('pre', { className: 'ce-plain' }, JSON.stringify(parsed, null, 2));
     },
   },
   ```

2. That's it — detection is automatic (shown as the file-type label), and
   save/edit work unchanged.

### Renderer contract

- `match(name)` → boolean, used for auto-detection.
- Text type: `render(text)` → React element(s), called only in Preview mode and
  wrapped in a try/catch by the view (a throwing renderer degrades to an error
  message, not a crashed slot).
- Binary type: `binary: true` + `kind` and **no** `render`. The view renders it
  from the raw bytes (`fileText.data`) and disables Edit/Save. The PDF (`kind:
  'pdf'` → `<iframe>`) and image (`kind: 'image'` → `<img>`) entries are the
  reference implementations (a `Blob` → `URL.createObjectURL`).
- Renderers must use `React.createElement` (no JSX) and the theme tokens
  (`var(--dsw-alias-*)`).

### Adding a binary file type (PDF / images)

Binary previews need the raw bytes, not decoded text:

1. Add a `FILE_TYPES` entry with `binary: true` and a `kind` (and no `render`).
2. Extend `binaryMimeFor(type, name)` in `client.js` to return that kind's MIME
   type.
3. If the kind isn't `pdf` or `image`, add a body branch in `CorporaPage`
   (mirror the PDF/image branch) that renders from `fileText.data` via
   `useObjectUrl(data, mime)`.
4. Edit/Save are disabled automatically: the `binary` flag forces Preview mode
   and disables the Edit and Save buttons.

## Coding rules

- The client half is a single `window.__ModuleLoader__.load` factory; keep
  everything inside it. Only `require('react')` is allowed.
- Register resources inside `apply` via `ctx.effect(...)` and return disposers.
- Keep per-file/per-session state in React hooks (`useState`/`useRef`); the
  module-level `remote` and `sidebarRight` are set once in `apply`.
- Visible text goes through `t(...)` (locale namespace `corpora-editor`); add
  the key to all 8 locale dicts in `apply` and to `locale/*.json` for metadata.
- No `dangerouslySetInnerHTML`; build all markup with `React.createElement`
  (already enforced by the module-loader environment).

## Useful verification facts

- `cordis_inspect` (Host) `Runtime.getVersion` → the running DSH version.
- `cordis_inspect` (Client) `Slots.listSubTree` → live slot occupants.
- `cordis_inspect` (Client) `Service.listService` → available client services.
- `cordis_inspect` (Client) `Theme.listTokens` → theme token names.
