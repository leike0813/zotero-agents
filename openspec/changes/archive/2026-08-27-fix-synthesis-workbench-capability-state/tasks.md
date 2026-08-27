## 1. Lock the Workbench request contract

- [x] 1.1 Add failing coverage for default UI-state projection and native capability admission, and verify the tests reproduce `invalid_request` before the fix
- [x] 1.2 Replace the broad Workbench state alias with a concrete registry/reviews/reader/graph DTO and shared builder, and verify `npm run check:synthesis-contracts` passes
- [x] 1.3 Align the Workbench JSON Schema and positive corpus with the concrete DTO and canonical Citation Graph query, and verify `npm run check:synthesis-cross-language-contracts` passes

## 2. Project and validate Workbench state

- [x] 2.1 Project default local UI state into the narrow protocol DTO while omitting presentation-only fields, and verify the client-foundation projection case passes
- [x] 2.2 Map Graph filters, layout, continuation cursor, and expected graph hash into the canonical Graph query, and verify the continuation projection case passes
- [x] 2.3 Reuse the shared Workbench state builder at grouped client dispatch, and verify unprojected state is rejected before the legacy port is invoked

## 3. Exercise production boundaries

- [x] 3.1 Update shared production-route scenarios to use one representative typed Workbench state, and verify Chrome and surface capability invocations pass strict input rebuilding
- [x] 3.2 Cover default Workbench state through native composition and verify both Chrome and Home surface calls reach the mocked RPC client
- [x] 3.3 Route adapter-produced state through the real Rust process Index scenario and verify the focused production-route test passes

## 4. Run repository gates

- [x] 4.1 Run TypeScript typecheck plus Synthesis contract and Workbench surface-parity gates, and verify all commands pass
- [x] 4.2 Run the focused client, native, Graph-state, and Rust-route regression tests, and verify all change-owned cases pass
- [x] 4.3 Run formatting, lint, and `git diff --check` on the touched implementation and test files, and verify no change-owned issue remains

## 5. Lock the Workbench result contract

- [x] 5.1 Add a failing native-composition matrix for all eight surfaces and all three Review tabs, and verify the generic result schema rejects real non-Index projections
- [x] 5.2 Add a failing grouped-client case that returns a valid Index projection for a Home request, and verify the client rejects the wrong-surface result
- [x] 5.3 Replace the aggregate result schema with closed per-surface definitions and a request-selected union without an opaque JSON escape
- [x] 5.4 Expose the same per-surface projection map through `SynthesisWorkbenchClient.readSurface` and the in-process port

## 6. Align real result projections

- [x] 6.1 Model Topic Graph, Concept, Tag, Reference registry, Citation Graph, and Reader Topic detail fields from the real Rust wire output
- [x] 6.2 Add positive corpus coverage for representative snake-case and camel-case projections plus a negative wrong-surface case
- [x] 6.3 Route all surfaces and Review tabs through native composition and UI snapshot conversion against a real Rust process
- [x] 6.4 Route a non-empty Citation Graph through native composition and verify visible nodes and edges survive UI projection

## 7. Re-run second-round gates

- [x] 7.1 Run contract typecheck, recursive cross-language validation, Workbench surface parity, and project TypeScript checks
- [x] 7.2 Run focused grouped-client and native all-surface tests plus real Rust Index, Topic lifecycle, and non-empty Reference/Graph route tests
- [x] 7.3 Run formatting, lint, OpenSpec validation, and `git diff --check` for the completed second-round change

## 8. Isolate real persisted Workbench data

- [x] 8.1 Add a failing historical Topic case proving Home/Topics must not decode the complete legacy bundle
- [x] 8.2 Add failing persisted Concept Review coverage for snake-case proposal fields and the approve/reject application path
- [x] 8.3 Add real-data contract cases for lightweight Topic rows, closed Reference evidence, and storage-free Concept Review rows

## 9. Align native producers with public Workbench DTOs

- [x] 9.1 Add a lightweight Topic Workbench application DTO and reuse the existing readiness calculation without parsing full Topic payloads
- [x] 9.2 Add one strict stored Concept proposal decoder shared by review actions and runtime projection
- [x] 9.3 Project Reference evidence by proposal kind and remove storage-only Concept/Reference payloads from the public result
- [x] 9.4 Normalize absent Concept and Topic Graph manifest identity to `null`
- [x] 9.5 Rebuild native Workbench results against the originating surface and Review tab immediately after transport resolution

## 10. Exercise persisted Home, Topics, and Review routes

- [x] 10.1 Route a non-empty historical-safe Topic projection through native composition and the UI snapshot adapter
- [x] 10.2 Route persisted rich Reference evidence and legacy Concept proposal rows through the real Rust production route
- [x] 10.3 Route a persisted Topic Graph review row through the same request-selected native boundary

## 11. Complete third-round gates and prebuild

- [x] 11.1 Run contract typecheck, cross-language validation, TypeScript checks, Rust tests/clippy/format, parity, and focused production-route tests
- [x] 11.2 Validate the synced specs and `git diff --check`
- [ ] 11.3 Commit and push the exact source identity, dispatch the governed seven-platform sidecar prebuild, synchronize the verified bundles, pass runtime freshness, and validate the completed archived change
