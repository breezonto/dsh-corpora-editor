# Corpora Editor

A DeepSeek Harness (DSH) plugin that turns the chat session into a small,
VSCode-style editor for **text-encoded files**, plus a **read-only preview for
PDF files**. It adds a **Corpora Editor** panel to the left sidebar (beside
Plugins and Automation tasks) where you can edit a file and switch between an
**Edit** mode and a **Preview** mode.

## Documentation

- [`AGENTS.md`](AGENTS.md) — shared context for AI agents (read this first).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — components, data flow, extension points.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — install, debug loop, extension recipes.
- [`docs/requirements/REQ-0.md`](docs/requirements/REQ-0.md) — baseline requirements; add `REQ-N.md` files here to propose features.
- [`docs/WIKI.md`](docs/WIKI.md) — FAQ, troubleshooting, glossary.

## Features

- **Edit / Preview modes** — toggle between a plain text editor and a rendered
  preview.
- **File-type label** — shows the auto-detected Preview renderer: Markdown,
  JSON, CSV, XML, plain text, or PDF, with syntax highlighting for text types.
- **PDF preview** — `.pdf` files render in the browser's built-in viewer and
  are **preview-only**: Edit and Save are disabled for them.
- **Save to disk** — writes your text edits back to the workspace file.
- **Built-in file tree** — a file tree in the panel's right bar browses the
  workspace; pick a file to edit or preview it.

## Requirements

- DeepSeek Harness `^0.2.3-alpha.2`.
- The workspace/`Files` sidebar and the terminal controller must be present
  (both ship with DSH).

## Install

1. Copy this directory somewhere on disk (it is a local bundle).
2. In DSH, open **Settings → Plugins → Add plugin** and choose the directory
   containing `package.json`.
3. Enable the **Corpora Editor** row if it is not enabled automatically.

Or, if you manage plugins through the plugin manager, install the bundle from
this directory (`install_bundle`).

## Usage

1. Click **Corpora** in the left sidebar.
2. In the panel's right bar, browse the file tree and pick a file.
3. Use **Edit** to change the content, **Preview** to see it rendered, and
   **Save** to write it back.

## Architecture

The browser half is a single self-contained module. The pieces that matter for
extension are deliberately isolated:

- **File-type registry** (`FILE_TYPES` in `client.js`) — each entry declares
  `id`, `label`, and a `match(name)` predicate. Text types add a `render(text)`
  function; binary types (PDF) set `binary: true` and are rendered by the view
  from the raw bytes instead. Adding JSON, XML, or CSV support means adding one
  entry here (plus any renderer); the editor shell, mode switch, and save logic
  stay untouched.
- **Read** uses the `workspaceFiles` Remote namespace (`readBytes`).
- **Save** uses the terminal controller (DSH's only client-accessible write
  path): it opens a short-lived shell, writes the file via base64 + redirect,
  then closes the terminal. PDFs are never saved.

## Known limitations

- **Save opens a brief terminal.** DSH exposes no client-side file-write API, so
  saving runs through a short-lived terminal that appears and disappears.
- **Focus-only tab switches are polled.** DSH has no observable for "which tab
  is focused", so the editor re-reads the active file on a short cadence.
- Large files (over ~32 MiB) are refused by the read endpoint.
- **PDFs are preview-only.** A PDF is rendered with the browser's built-in
  viewer; there is no PDF text editing or save.
