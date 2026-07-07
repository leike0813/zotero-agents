## 1. Specification

- [x] 1.1 Add ACP Chat transcript coalescing delta spec.
- [x] 1.2 Add ACP Skills transcript coalescing delta spec.
- [x] 1.3 Document project-level ACP transcript projection hard rule.

## 2. Tests

- [x] 2.1 Add ACP Skills regression coverage for `tool_call_update` side-channel coalescing.
- [x] 2.2 Add ACP Chat regression coverage for `tool_call_update` side-channel coalescing.
- [x] 2.3 Add source-level guards against backend-specific coalescing and direct `tool_call_update` finalization.

## 3. Implementation

- [x] 3.1 Add shared ACP transcript boundary classification helper.
- [x] 3.2 Apply helper in ACP Skills transcript normalization.
- [x] 3.3 Apply helper in ACP Chat transcript normalization.

## 4. Validation

- [x] 4.1 Run focused ACP Skills and ACP Chat transcript tests.
- [x] 4.2 Run full ACP Skills and ACP Chat test files.
- [x] 4.3 Run `openspec validate harden-acp-assistant-message-coalescing --strict`.
