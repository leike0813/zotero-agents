## 1. Topic Graph State

- [x] Add deleted status support for topic graph edges and review items.
- [x] Add soft-delete and purge helpers for topic-related graph relations.

## 2. Delete and Purge Flow

- [x] Call relation soft-delete from topic artifact delete.
- [x] Call relation purge from deleted topic artifact purge.
- [x] Filter deleted relation state from UI active views.

## 3. Tests and Verification

- [x] Cover soft delete and purge behavior in topic graph and integration tests.
- [x] Run focused tests, TypeScript check, OpenSpec validation, and Prettier check.
