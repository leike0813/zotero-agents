# Design

Dashboard uses a host-owned snapshot protocol. This change adds a lightweight render contract to that protocol instead of changing workflow/runtime behavior.

Host snapshots include `surfaceSignatures` for chrome and the selected surface. Chrome covers active tab, tab availability, and backend load errors. The selected surface signature covers only the data needed by the active view: Products/Skill Feedback data on the Products tab, runtime log data on Runtime Logs, running rows on Home, backend rows on backend tabs, and workflow option descriptors on Workflow Options.

Noisy refresh reasons (`task-update`, ACP skill run snapshot updates, backend health, periodic timer) are best-effort gated. If a noisy refresh rebuilds the same selected-surface signature and the same chrome signature, the host does not post a new Dashboard snapshot. User actions and initialization always post.

The browser renderer keeps `#app` as a stable shell containing one sidebar and one main surface. It still treats the host snapshot as the source of truth, but it skips duplicate unchanged snapshot payloads and preserves browser-local UI state such as scroll positions, product tree expansion, collapsed product list state, and feedback checkbox state.
