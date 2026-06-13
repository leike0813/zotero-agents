## Overview

Core workflow display is intentionally presentation-only. The raw workflow manifest gains a `display` object, while runtime contracts continue to use stable workflow ids and parameter keys.

## Manifest Contract

`workflow.json` may include:

```json
{
  "display": {
    "core": true,
    "emoji": "📊"
  }
}
```

`display.core` defaults to `false`. `display.emoji` is a locale-independent short display prefix and is not resolved from workflow i18n messages.

## Display Projection

The workflow display helper resolves localized labels as before, then prefixes a valid emoji when the caller asks for a user-visible label. Sorting uses core status first, then the localized label without emoji, then workflow id.

## UI Boundary

The menu groups workflows at render time. Dashboard home snapshots expose `core: boolean` for workflow bubbles. Existing history rows and persisted task labels are not migrated.
