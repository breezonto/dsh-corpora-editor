# Corpora Editor

A DeepSeek Harness (DSH) plugin that turns the chat session into a small,
VSCode-style editor for **text-encoded files**. It adds a **Corpora Editor**
panel to the left sidebar (beside Plugins and Automation tasks) where you can
edit a file and switch between an **Edit** mode and a **Preview** mode.

## Documentation

- [`AGENTS.md`](AGENTS.md) — shared context for AI agents (read this first).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — components, data flow, extension points.
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — install, debug loop, extension recipes.
- [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) — requirements, constraints, roadmap.
- [`docs/WIKI.md`](docs/WIKI.md) — FAQ, troubleshooting, glossary.

## Features

- **Edit / Preview modes** — toggle between a plain text editor and a rendered
  preview.
- **File-type label** — shows the auto-detected Preview renderer: Markdown,
  JSON, CSV, XML, or plain text, with syntax highlighting.
- **Save to disk** — writes your edits back to the workspace file.
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
  `id`, `label`, a `match(name)` predicate, and a `render(text)` function.
  Adding JSON, XML, or CSV support means adding one entry here (plus any
  renderer); the editor shell, mode switch, and save logic stay untouched.
- **Read** uses the `workspaceFiles` Remote namespace (`readBytes`).
- **Save** uses the terminal controller (DSH's only client-accessible write
  path): it opens a short-lived shell, writes the file via base64 + redirect,
  then closes the terminal.

## Known limitations

- **Save opens a brief terminal.** DSH exposes no client-side file-write API, so
  saving runs through a short-lived terminal that appears and disappears.
- **Focus-only tab switches are polled.** DSH has no observable for "which tab
  is focused", so the editor re-reads the active file on a short cadence.
- Large files (over ~32 MiB) are refused by the read endpoint.
