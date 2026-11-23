# REQ-2 — Remember the last working directory

## Summary

Persist the file tree's current directory and restore it the next time the
Corpora view opens, so the user resumes where they left off instead of the
session home.

## Motivation

Re-entering the Corpora view always reset the file explorer to the session's
`$HOME`, so a user who regularly works in a deep path had to navigate back to it
every time they returned from the chat session.

## Acceptance criteria

- Navigating in the file tree (folder rows, `↑`, `⌂`) persists the current
  directory.
- Leaving the Corpora view and re-entering it restores the last directory.
- The remembered directory survives a full page reload and a DSH restart (same
  browser origin).
- If the remembered directory no longer exists or is unreadable, the view falls
  back to the session home instead of showing a directory error.
- The `⌂` button still navigates to the session home.

## Design notes / constraints

- **Storage is browser `localStorage`** under the key
  `corpora-editor.lastCwd`. It is best-effort: reads/writes are wrapped in
  try/catch, so a browser with storage disabled or full degrades to the home
  directory rather than failing.
- **Write:** a `useEffect` watching `cwd` writes the value on every navigation.
- **Read:** the mount effect resolves `$HOME` first (needed for the `⌂` button),
  then seeds `cwd` from `readLastCwd()` (falling back to home when empty).
- **Stale-path fallback:** a `restoredRef` marks that `cwd` came from storage; a
  successful `ls` clears it, and only while it is set does a failed `ls` recover
  to the session home. Normal navigation errors keep the existing error message.
- **No Host/config dependency:** persistence lives entirely in the browser half,
  consistent with the static bundle's client-only model.

## Status

done
