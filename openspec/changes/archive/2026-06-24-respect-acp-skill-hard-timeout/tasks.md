## 1. Specs

- [x] Add delta specs for ACP hard timeout execution and ACP runtime option UI exposure.

## 2. Implementation

- [x] Add ACP effective runtime option synthesis for `hard_timeout_seconds`.
- [x] Add local timeout timer management to initial and recovered ACP skill run prompts.
- [x] Expose and normalize ACP `hard_timeout_seconds` provider option.

## 3. Tests

- [x] Cover provider runtime override, request payload runtime option, runner default, 1200 fallback, timeout disconnect, interactive turn reset, and recovered session timeout.
- [x] Cover ACP provider schema and normalization for Job Timeout.
- [x] Run the minimum related test set.
