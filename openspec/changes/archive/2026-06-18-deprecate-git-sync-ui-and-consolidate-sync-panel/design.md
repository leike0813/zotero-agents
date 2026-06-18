# Design

## Deprecation Boundary

Git Sync becomes a hidden/deprecated transport. The code remains callable internally, but no visible Preferences card, Synthesis Home action, or Dashboard entry should trigger Git Sync. Comments on retained Git Sync entrypoints should state that WebDAV durable bundle sync is the visible manual transport.

## Preferences

Preferences keeps WebDAV Sync configuration only. Git Sync prefs defaults stay in `addon/prefs.js` because retained code may still read them, but the page and preference script no longer bind Git Sync controls.

## Synthesis Home Sync Panel

The Home page renders one Sync section focused on WebDAV:

- a compact summary row for WebDAV queue/config/remote state;
- actions from WebDAV allowed actions;
- conflict review using existing semantic conflict action names;
- a terminal-like log block for pending command, last completed/failed command, diagnostics, connection test, and last run.

The global status bar remains the short feedback surface. The Home sync terminal is the detailed feedback surface.

Library Insights may show a Review items card. Its count must be derived from snapshot review summary data and domain review arrays, not from opening the Review tab.

## Compatibility

Existing `sync.git` projection data may still appear in snapshots, but Home ignores it. Existing Git Sync tests may remain service-level. UI tests should assert that Git Sync is not visible from the user-facing Home/Preferences surfaces.
