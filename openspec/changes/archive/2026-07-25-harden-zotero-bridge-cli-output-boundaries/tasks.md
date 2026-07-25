## 1. Contracts And Tests

- [x] 1.1 Add failing tests for criteria-bound cursor pages, text chunks, runtime DTO
  continuation fields, surface output-boundary coverage, and compact surface search.
- [x] 1.2 Add the explicit command output-boundary contract and full 125-command audit.

## 2. Shared Boundary Infrastructure

- [x] 2.1 Implement the shared Host Bridge cursor/page and text-chunk module with
  structured invalid/expired cursor failures.
- [x] 2.2 Align Zotero library page defaults to 25/100 and retain database keyset
  traversal.

## 3. Runtime Collection And File Outputs

- [x] 3.1 Page workflow/run/permission/context/library/product collections and make
  endpoint DTOs match command result schemas.
- [x] 3.2 Bound Synthesis and debug collections, chunk long text, and move full
  artifact/review/export/diagnostic payloads to Host Bridge file delivery.
- [x] 3.3 Keep workflow write responses aggregate-only and expose detail through
  bounded follow-up reads.

## 4. CLI And Agent Surface

- [x] 4.1 Add CLI cursor/limit/offset arguments and compact `surface search` results.
- [x] 4.2 Add current-state paging, file verification, failure, and recovery guidance
  to source Skill content, then render governed command cards and review mirror.

## 5. Verification

- [x] 5.1 Run focused Rust and `106/107/108/108-mcp/123/169` tests and OpenSpec
  validation.
- [x] 5.2 Run content rendering/checks, semantic review, package depth/duplicate gates,
  and report all four semantic counts.
