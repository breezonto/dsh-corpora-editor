# REQ-1 — PDF file preview (Corpora Editor)

## Summary

Preview `.pdf` files in the Corpora panel using the browser's built-in viewer,
and make PDFs read-only: Edit and Save are disabled while a PDF is open.

## Motivation

The Corpora panel already reads arbitrary files, but everything is decoded as
UTF-8 text — a PDF is binary, so it showed as garbage. Previewing a PDF is a
common, high-value case, but the editor has no text model for a PDF, so editing
must be disabled rather than silently corrupting the file.

## Acceptance criteria

- Selecting a `.pdf` in the file tree renders it inline in the browser's PDF
  viewer (a `Blob` URL loaded into an `<iframe>`).
- The file-type label shows **PDF**.
- The **Edit** button is disabled and the view is forced to **Preview** mode.
- The **Save** button is disabled for PDFs.
- Selecting a text file afterwards restores normal Edit/Preview/Save behavior.
- The blob URL is revoked when the file changes or the panel unmounts (no leak).

## Design notes / constraints

- **No binary decode to text.** `useFileText` now also returns the raw byte
  buffer (`data`) alongside the UTF-8 `text`; the PDF branch uses `data`.
- **Rendering is delegated to the browser.** A `Blob('application/pdf')` →
  `URL.createObjectURL` is loaded into an `<iframe>`, so no PDF.js dependency
  and no build step (still static-bundle-safe: only `require('react')`).
- **`FILE_TYPES` gained a `binary` flag.** The PDF entry is
  `{ id: 'pdf', label: 'PDF', match: /\.pdf$/i, binary: true }` with no
  `render`; the `binary` flag is what disables Edit/Save and forces Preview.
- **PDFs are never written.** `saveFile` is not invoked for binary types.

## Status

done
