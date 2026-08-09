## ADDED Requirements

### Requirement: Workflow Host file pickers SHALL use a valid native parent context

Before invoking a toolkit-backed or native Zotero file picker, the shared host
file-picker boundary SHALL select an open parent window with a browsing context.
It SHALL skip unavailable dialog and preferences windows and fall back to the
Zotero main window when that window is usable. This requirement applies to
directory, single-file, save-file, and multi-file picker modes.

#### Scenario: Stale dialog window falls back to the main window

- **WHEN** the preferred dialog window is closed or lacks a browsing context
- **THEN** the host SHALL pass the usable Zotero main window to the picker

#### Scenario: Live dialog window remains the picker parent

- **WHEN** the preferred dialog window is open and has a browsing context
- **THEN** the host SHALL pass that dialog window to the picker
