## Why

ACP Chat can advance to a new prompting turn while the composer remains visually enabled because a critical transcript boundary suppresses the concurrent lifecycle publication. Shared live transcript rendering can also retain stale virtual geometry and accumulate competing bottom-stick animation frames during very long output, delaying the visible terminal Markdown state and destabilizing scrolling.

## What Changes

- Publish ACP Chat transcript boundaries and lifecycle status additively so the composer reflects a resumed prompting turn immediately.
- Route ACP Chat lifecycle status to both owner controls and the independently guarded composer region without coupling transcript-only rendering to panel chrome.
- Commit measured transcript row heights before scheduling virtual geometry reconciliation on the live renderer state.
- Coalesce per-container bottom-stick animation work while preserving tail-follow and user-controlled scroll anchors.
- Cover ACP Chat cancellation/resume, ACP Skills reply state, terminal Markdown, repeated tall-row measurement, and scroll scheduling with regression tests.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `acp-chat-performance-ui`: Require lifecycle and transcript change kinds from the same critical transition to publish additively while preserving region isolation.
- `assistant-sidebar-ui`: Require shared virtualized transcripts to converge measured tall-row geometry while preserving tail-follow and user-controlled scroll anchors.
- `assistant-workspace-ui-refresh-governance`: Require incremental measured-height and terminal Markdown reconciliation to converge on committed live state without duplicate scheduling or unrelated DOM rebuilds.

## Impact

- Affects ACP Chat workspace change classification and publication mapping.
- Affects the shared Assistant transcript renderer used by ACP Chat and ACP Skills.
- Adds focused core/UI regression coverage; no public protocol, schema, transcript-store format, dependency, or migration changes.
