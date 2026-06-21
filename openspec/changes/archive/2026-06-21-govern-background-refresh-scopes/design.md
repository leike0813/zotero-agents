## Context

The plugin has several long-lived host-side timers. Most are harmless because
they check one runtime or one service, but dashboard and task attention refresh
paths currently call task/run list APIs that merge SkillRunner projections.
After the separated run-store work, those projections can require full
`payload_json` reads and JSON parsing for every retained SkillRunner run.

The user-visible symptom is periodic Zotero-wide soft jank when many
SkillRunner runs have accumulated. The fix must preserve existing UI behavior
while making background refreshes cheap and scoped by construction.

## Goals / Non-Goals

**Goals:**

- Make long-lived timer work pass through explicit scope and read-budget rules.
- Provide lightweight task/run summary APIs for counters, active rows, and
  scoped dashboard/sidebar UI.
- Keep full payload reads available for selected run, scoped backend detail,
  recovery, and explicit diagnostic flows.
- Add diagnostics that tests can use to detect heavy unscoped reads.

**Non-Goals:**

- Do not delete or migrate user history merely to improve performance.
- Do not change ACP or SkillRunner backend protocols.
- Do not replace the dashboard 1200ms scheduler with a different UX model.
- Do not impose fixed millisecond performance thresholds as correctness tests.

## Decisions

1. **Use read-model APIs instead of timer-specific special cases.**
   Background surfaces will call lightweight summary/projection functions with
   explicit filters. This avoids duplicating fragile filtering logic across
   dashboard, sidebar, workspace, and popover code.

2. **Persist SkillRunner projection summaries separately from full records.**
   The existing run store still owns full records, but task projection rows are
   small and stable enough to store independently. Summary reads can use those
   rows without selecting or parsing full run payloads.

3. **Expose diagnostic counters around heavy reads.**
   Tests will assert that background refresh flows do not read full run
   payloads. This is more stable than asserting wall-clock time.

4. **Treat periodic ticks as schedulers, not readers.**
   A periodic callback may check foreground/scope state and enqueue a scoped
   refresh. It must not directly read full tasks, runs, logs, products, or
   histories unless the active scope permits that read shape.

## Risks / Trade-offs

- [Risk] Separate projection summaries can become stale if update paths forget
  to update them. -> Mitigation: centralize SkillRunner run upsert/delete paths
  so full record and projection summary updates happen together.
- [Risk] Some admin/detail views need full history. -> Mitigation: allow full
  reads only behind explicit backend/request/detail scopes and foreground checks.
- [Risk] Governance tests can become brittle if they assert exact source text.
  -> Mitigation: test exported runtime diagnostics and stable API behavior.
- [Risk] Existing tests may expect full records from default task list helpers.
  -> Mitigation: keep full APIs available under explicit names and migrate UI
  paths to lightweight helpers without removing legacy internals immediately.

## Migration Plan

- Add lightweight read-model APIs and diagnostics first while preserving current
  full APIs.
- Move background UI refresh paths to scoped read-model APIs.
- Add governance tests covering all long-lived timers and critical UI refreshes.
- Leave full read APIs for selected/detail/recovery paths.
