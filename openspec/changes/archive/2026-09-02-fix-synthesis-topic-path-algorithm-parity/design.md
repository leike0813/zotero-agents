## Context

See `proposal.md` for the production failure. The current Rust canonical store already derives 16 hash characters after `sha256:`; the TypeScript helper accidentally passes the absolute end index `16` instead of `7 + 16`, producing 9 characters. Legacy production snapshots were written by that TypeScript path and the existing startup preflight derives only the Rust path.

## Goals / Non-Goals

**Goals:**

- Make TypeScript and Rust derive identical current path IDs.
- Read valid snapshots written under the historical 9-character hash path.
- Keep the canonical public `pathId` and all new writes at 16 characters.
- Preserve fail-closed validation and historical bytes.

**Non-Goals:**

- Do not change ASCII slug behavior.
- Do not scan arbitrary Topic directories or trust an unvalidated database path as a filesystem authority.
- Do not delete, rename, or rewrite historical directories during startup.
- Do not change the repository schema, wire DTOs, release artifacts, or prebuild workflow.

## Decisions

### Keep the 16-character algorithm as the current contract

Rust and the canonical store design already use the first 16 lowercase hexadecimal digest characters after `sha256:`. TypeScript will be corrected to that behavior. Changing Rust to 9 characters would preserve the accidental bug and retain a weaker identity space.

### Centralize compatibility resolution inside the canonical store

Add one internal resolver used by current snapshot reads and legacy preflight. It checks the current 16-character directory first, then the exact historical 9-character fallback only when the Topic produces no slug. It never scans sibling directories. If the current directory exists but is invalid, the resolver fails instead of hiding corruption with the legacy directory.

### Normalize legacy reads to the current public identity

When a historical directory is selected, content is validated from its actual location but the returned snapshot/view uses the current 16-character `pathId`. New promotion therefore writes to the current directory and subsequent reads prefer it. The historical directory remains untouched.

### Use one shared test corpus for both languages

Add ASCII, mixed-Unicode, all-Unicode, current-16, and historical-9 path vectors to the durable foundation corpus. TypeScript and Rust tests consume those literals instead of recomputing expected values inside each test.

### Preserve existing error boundaries

Missing candidates remain `absent`; malformed content, identity mismatch, hash mismatch, or an invalid existing current directory remains a canonical invalid/mismatch result. No new public error DTO is required.

## Risks / Trade-offs

- [A historical 9-character prefix collides for two Topic IDs] -> Validate manifest/metadata Topic identity and fail closed rather than selecting an arbitrary directory.
- [A legacy directory remains after a later 16-character promotion] -> Canonical current wins deterministically; cleanup is intentionally outside this change to avoid destructive startup writes.
- [A caller relies on the physical legacy path] -> Canonical store reads remain the only supported access path; projections expose the normalized current identity.

## Migration Plan

1. Land red contract and canonical-store tests for the 16-character vector and 9-character read compatibility.
2. Correct the TypeScript helper and implement the centralized Rust resolver.
3. Run the real native startup fixture and verify discovery, migration, read, update, archive, and shutdown behavior.
4. Run targeted TypeScript, Rust, formatting, type, and OpenSpec validation.

Rollback is source-level. Existing historical files are not rewritten or deleted, and failed validation remains before migration publication.
