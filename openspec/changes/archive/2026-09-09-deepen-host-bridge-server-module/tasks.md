## 1. Behavioral Baseline

- [x] 1.1 Run the existing Host Bridge server, capability, workflow, file, and socket tests and verify the pre-change seam is green.
- [x] 1.2 Add a table-driven HTTP-seam regression for every affected dynamic v2 state-changing route without an operation id and verify it fails before implementation.

## 2. HTTP Implementation Depth

- [x] 2.1 Move strict byte-to-request parsing and the parsed request DTO into `hostHttpRequestReader.ts`; verify server and socket tests pass through their existing interfaces.
- [x] 2.2 Move memory/file response construction and output transfer into `runtimeHttpResponse.ts`; verify server and file tests preserve bytes, headers, and cleanup.

## 3. Private Route Adapters

- [x] 3.1 Add the private route-match/admission contract and diagnostics plus capability/context adapters; verify server and capability tests pass without new test exports.
- [x] 3.2 Extract the workflow/activity adapter; verify workflow-control tests preserve route precedence, approvals, replay, and error mapping.
- [x] 3.3 Extract file and synthesis adapters; verify file-download and workflow-control tests preserve transfer and maintenance behavior.

## 4. Admission Single Source

- [x] 4.1 Replace the independent state-changing path classifier with descriptor-driven admission, require operation ids for all affected v2 routes, and verify the new regression plus existing canonical/replay tests pass.

## 5. Domain Language And Documentation

- [x] 5.1 Add Host Bridge Server to `CONTEXT.md`, update lifecycle ownership and current routes, and verify current code/docs/specs contain no `/bridge/v1/` paths while archived changes remain untouched.
- [x] 5.2 Sync the six delta specs into the current specs and verify the OpenSpec change strictly validates.

## 6. Integration Verification

- [x] 6.1 Run focused Host Bridge tests, TypeScript/plugin build, formatting/lint checks, and OpenSpec verification; record any independent failure without weakening the change.
