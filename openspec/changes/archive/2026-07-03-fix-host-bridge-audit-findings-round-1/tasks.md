## 1. Runtime Fixes

- [x] Bound Host Bridge notification inbox retention by count and age.
- [x] Harden diagnostic redaction for URLs, credentials, and private paths.
- [x] Make cache invalidation response and approval text state default-service invalidation.
- [x] Reuse the shared Artifacts top-level item classifier in the custom column.

## 2. Governance Fixes

- [x] Extend current-state-only checks to profile workflow semantic sources and generated copies.
- [x] Move terminology equality validation out of cron command validation.
- [x] Fix the in-scope `host-bridge-cli-interface` requirement parser issue.
- [x] Format the audit-reported files.

## 3. Validation

- [x] Run focused Host Bridge server/workflow-control/profile/artifacts tests.
- [x] Run profile/doc sync checks.
- [x] Run in-scope OpenSpec strict validation.
