## 1. Freeze contracts and evidence

- [x] 1.1 Record implementation baseline `b7a4c9536640d4c4947488ba26b0b42f059df34a`, materialized Host Bridge surface metrics, and the approved DEL-09/10/11 deletion inventory; verify the evidence files are present and the pre-existing help-doc manifest diff is unchanged.
- [x] 1.2 Complete the Zotero 7.0.32, 9.0.6, and 10.0.1 native audit for Library tab/window focus, collection-tree selection, `viewItems`, `FileHandlers.open`, and Reader initialization/location; verify the audit records feature detection and unsupported fallbacks.

## 2. Broker navigation owner

- [x] 2.1 Extend the complete fail-closed Broker harness and add red tests for the seven closed navigation inputs/results, portable refs, wrong kinds, unknown fields, and stable non-retryable errors; verify the tests fail against the legacy surface.
- [x] 2.2 Implement `focusZotero`, library-view, collection, and Saved Search selection with captured-window control, public postcondition verification, transient-filter handling, and minimal results; verify valid, unavailable, and cancellation-before-effect cases.
- [x] 2.3 Implement bounded ordered `revealItems` with one-library validation, duplicate/mixed-state rejection, parent expansion, and no promotion/deduplication; verify 1/100/101-target and exact-order behavior.
- [x] 2.4 Implement `openItem` and `openReaderLocation` using the detected native seams, including annotation parent checks, PDF page bounds, EPUB CFI bounds, built-in Reader tab ownership, and no-fallback failure; verify dispatch-level success and unsupported-location behavior.
- [x] 2.5 Remove legacy `openLegacyZotero*`, `openNote`, `openCollection`, `openSelection`, and navigation-specific unsafe branches after all Broker callers migrate; verify no production caller or old navigation member remains.

## 3. Host Bridge and MCP projections

- [x] 3.1 Register the seven `navigation.*` capabilities with strict input/output schemas, host-control effects, non-retryable error mapping, and one captured main window; verify registry/contract parity and no direct native fallback.
- [x] 3.2 Replace the four `/context/*/open` routes with registry dispatch and implement operator/interactive/automated/invalid scope admission; verify legacy routes fail, denied callers never reach the Broker, and eligible callers do not create per-call approval prompts.
- [x] 3.3 Mirror navigation through MCP with one request-header scope parse, list hiding, call hard-deny, and shared handler/result schemas; verify operator, `acp-chat`, run scopes, malformed scope, and no-session behavior.

## 4. CLI projection

- [x] 4.1 Add the seven `navigation` leaf commands to the executable command contract, parser, schema mode, client dispatch, examples, effect/approval metadata, and recovery descriptions; verify `--schema`, strict input, and one-envelope output tests.
- [x] 4.2 Remove `context item|note|collection|selection open` builders, routes, aliases, cards, and instructions; verify parser rejection, raw-call rejection of old IDs, and no direct-route alias.
- [x] 4.3 Extend Rust CLI command and contract tests for portable refs, ordered reveal, Reader locations, scope headers, structured failures, and canonical capability paths; verify `cargo test --manifest-path cli/zotero-bridge/Cargo.toml` focused tests.

## 5. Workflow Host hard cut

- [x] 5.1 Remove `WorkflowHostApiV12.navigation` from types, composition, availability/error contracts, manifest, and conformance checks; verify the v12 projection is explicit and probing the removed member fails without Bridge fallback.
- [x] 5.2 Migrate or remove all Workflow/ACP navigation callers and documentation references; verify the official workflow scan reports zero navigation members, raw host access, and legacy host-version branches.

## 6. Native matrix and governed surfaces

- [x] 6.1 Add the Zotero-runtime navigation suite to full core and compatibility probe execution; verify the three-version matrix covers Library root, collection, Saved Search, regular item, PDF attachment, annotation, existing Reader, and cold Reader cases with cleanup. Local Linux runs passed for Zotero 7.0.32, 9.0.6, and 10.0.1; the cross-platform matrix remains intentionally unrun.
- [x] 6.2 Update Broker, Host Bridge lifecycle, CLI, MCP, and Workflow Host documentation plus OpenSpec main-spec deltas; verify current-state ownership and no mutation/Pi/release claims are introduced.
- [x] 6.3 Run `npx tsx scripts/host-bridge-semantic-review-context.ts`, review affected Minimum/Generic/Hermes composition, and record baseline-relative substantive lines, prose characters, zero unmapped/downgraded/unauthorized-dropped/intra-package-duplicate counts, and all warning dispositions.
- [x] 6.4 Render source-controlled Host Bridge content, run content/package/surface checks, prepare and finalize the Chinese review mirror, and verify generated cards remove only DEL-09/10/11 while preserving the existing help-doc manifest edit. English generated surfaces are refreshed; Chinese mirror translation/finalization is delegated and remains pending.

## 7. Verification and handoff

- [x] 7.1 Run focused Broker/Bridge/MCP/Workflow/CLI suites, then the required Node, Zotero, UI, compatibility, lint, and build commands; record unavailable native evidence without claiming success.
- [x] 7.2 Run `openspec validate canonicalize-zotero-navigation --type change --strict` and the official verify-change workflow; verify every task has implementation evidence and no contradictory main-spec requirement remains.
- [x] 7.3 Sync the approved deltas and archive `canonicalize-zotero-navigation`; verify the change is archived, the five original Issue #39 changes are complete, and no commit, push, release-set, prebuild, or publication action was performed.
