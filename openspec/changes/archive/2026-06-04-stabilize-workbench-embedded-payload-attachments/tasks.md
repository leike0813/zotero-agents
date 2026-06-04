## 1. OpenSpec and Docs

- [x] 1.1 Add change proposal, design, delta specs, and active docs for v2 embedded payload storage.

## 2. Payload Codec and Host APIs

- [x] 2.1 Implement v2 PNG ancillary chunk encoding/decoding with v1 tail-marker read compatibility.
- [x] 2.2 Add payload storage version, hash, source, and anchor diagnostics to payload manifests.
- [x] 2.3 Update attachment writer to insert/replace payload anchors and clean old payload attachments safely.

## 3. Workflow and Migration Wiring

- [x] 3.1 Wire digest/import/explainer note writers to v2 anchored payload storage.
- [x] 3.2 Upgrade debug migration for hidden HTML, v1 tail-marker, v2 missing-anchor repair, and conversation/custom notes.
- [x] 3.3 Ensure export and payload read paths remain compatible with v2, v1, and hidden payload inputs.

## 4. Synthesis Boundary

- [x] 4.1 Remove note-only fallback from Synthesis artifact availability.
- [x] 4.2 Report broken embedded payloads as error diagnostics rather than hidden-block availability.

## 5. Tests and Validation

- [x] 5.1 Update codec, Host Bridge/MCP, workflow, migration, Synthesis, and guard tests.
- [x] 5.2 Run OpenSpec validation, targeted tests, TypeScript check, and build.
