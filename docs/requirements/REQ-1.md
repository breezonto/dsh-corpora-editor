# REQ-1 — Binary file preview (PDF and images)

## Summary

Preview `.pdf` files and raster images in the Corpora panel, and make them
read-only: Edit and Save are disabled while a binary file is open.

## Motivation

The Corpora panel already reads arbitrary files, but everything was decoded as
UTF-8 text — a PDF or image is binary, so it showed as garbage. Previewing these
common binary formats is high-value, but the editor has no text model for them,
so editing must be disabled rather than silently corrupting the file.

## Acceptance criteria

- Selecting a `.pdf` in the file tree renders it inline in the browser's PDF
  viewer (a `Blob` URL loaded into an `<iframe>`).
- Selecting a raster image (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.bmp`,
  `.ico`, `.avif`) renders it inline in an `<img>`.
- The file-type label shows **PDF** or **Image** accordingly.
- The **Edit** button is disabled and the view is forced to **Preview** mode.
- The **Save** button is disabled for binary files.
- Selecting a text file afterwards restores normal Edit/Preview/Save behavior.
- The blob URL is revoked when the file changes or the panel unmounts (no leak).

## Design notes / constraints

- **No binary decode to text.** `useFileText` returns the raw byte buffer
  (`data`) alongside the UTF-8 `text`; binary branches use `data`.
- **Rendering is delegated to the browser.** A `Blob(mime)` →
  `URL.createObjectURL` is loaded into an `<iframe>` (PDF) or `<img>` (image),
  so no PDF/image library dependency and no build step (still
  static-bundle-safe: only `require('react')`).
- **`FILE_TYPES` gained a `binary` flag and a `kind`.** Binary entries are
  `{ id, label, match, binary: true, kind }` with no `render`; `binaryMimeFor`
  maps a binary type + filename to a MIME type. The `binary` flag is what
  disables Edit/Save and forces Preview.
- **SVG stays a text file.** SVG is text-encoded XML, so it remains in the XML
  entry (editable, with syntax highlighting) rather than the binary image path.
- **Binary files are never written.** `saveFile` is not invoked for binary types.

## Status

done
