# Design

Dashboard localization uses the existing snapshot `labels` channel instead of a new i18n envelope. Host/model builders resolve Fluent strings with existing helpers and attach display-only labels to snapshots. Static Dashboard pages consume those labels through local helpers or existing Assistant panel label roots.

Protocol fields remain raw. Action names, command names, storage schema, workflow contracts, runtime log messages, ACP transcripts, tool output, workflow labels, backend display names, and user/generated content are not translated by the Dashboard UI layer.

Readonly harness snapshots must include the same label keys needed by the reused Dashboard UI code. Harness compatibility is snapshot-based; it must not fork or duplicate Dashboard rendering behavior.

Governance checks cover four-locale key parity and direct Dashboard render-layer hardcoded UI patterns such as label fallback expressions, document title fallback, placeholder/title/aria/textContent literals in static Dashboard pages. Compatibility fallback inside shared projection helpers may remain only where it protects older snapshots and does not become the primary rendering source.
