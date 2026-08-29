## Context

See `proposal.md` for motivation. The current v11 types and Broker errors are valid production contracts, but v12 introduces shared portable DTOs, separate call control, recursive exactness, and a public error taxonomy used by several owners. The active facade must remain v11 until every vertical slice is ready.

The fixed baseline is `4dbddc24e884921262c559428bf851db5eadf2d7`. The architecture record is authoritative for exact DTO fields, the eleven error codes, code-specific details, trusted in-process exceptions, and the eventual 23/21/85 manifest.

## Goals / Non-Goals

**Goals:**

- Give shared public values and failures one contract owner independent of runtime behavior.
- Make Broker input and output portable by construction.
- Establish recursive projection and variant invariants before domain implementation.
- Provide stable test seams without assembling or publishing partial v12.

**Non-Goals:**

- Implementing library, mutation, research, Synthesis, filesystem, UI, or Host Bridge behavior.
- Changing `WORKFLOW_HOST_API_VERSION` or the built-in package guard.
- Creating a runtime capability catalog, proxy projection, whole-Broker alias, or compatibility facade.

## Decisions

### A projection-neutral error contract owns public failure data

Add `src/workflows/workflowHostErrorContract.ts` as a side-effect-free module containing the code union, details mapping, serializable error data, validation, sanitization, and safe factories. Broker, file, archive, resources, Synthesis, and UI deny adapters consume it. It imports no implementation owner.

Keeping the mapping in `hostApi.ts` was rejected because composition is not the error source of truth. Keeping it solely in the Broker was rejected because non-Zotero owners use the same taxonomy.

### Public types remain canonical while implementations stay local

`src/workflows/types.ts` owns public DTO identity and trusted in-process call signatures. Owners may keep private validated forms and internal seams, but every public alias resolves to one declaration. New domain modules must not copy reference, error, receipt, or JSON unions.

### V12 identity is staged but not activated

`workflowHostContract.ts` gains recursive exactness and variant inspection that can validate a candidate v12 manifest in tests. Production identity and the current v11 projection remain unchanged. Final activation installs the one code-native manifest and removes obsolete identity declarations atomically.

### Test adapters are complete and fail closed

Broker and owner test adapters explicitly implement every member in the interface or reject it as unavailable. Partial objects, `as any`, and unconfigured fallback to the real Zotero runtime are prohibited.

## Risks / Trade-offs

- [Shared types create circular imports] → Keep the error contract side-effect-free, make dependency direction explicit, and use type-only imports where needed.
- [Candidate v12 types accidentally become runtime identity] → Assert the production version remains 11 until the activation change.
- [Validation becomes an expensive second serialization pass] → Validate at construction and adapter seams with owner-specific bounds; do not recursively clone already validated results.
- [Later slices duplicate contract unions] → Add declaration and unresolved-alias governance to the contract test before those slices begin.

## Migration Plan

1. Add failing contract and Broker tests for portable refs, strict JSON, coded details, variants, and implicit widening.
2. Add the neutral error contract and canonical shared types.
3. Adapt `ZoteroHostCapabilityError` and fail-closed test adapters.
4. Add candidate recursive conformance while preserving the production v11 identity.
5. Run focused tests, type checks, build checks, and strict OpenSpec validation.

Rollback is source-level reversal to baseline `4dbddc24e884921262c559428bf851db5eadf2d7`; no persisted state or public version changes in this slice.
