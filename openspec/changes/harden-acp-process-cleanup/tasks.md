## 1. OpenSpec Artifacts

- [x] 1.1 Add proposal, design, and delta specs for process-control startup preflight and ACP cleanup behavior.

## 2. Platform Preflight and Logging

- [x] 2.1 Add process-control snapshot APIs with test seed/reset helpers.
- [x] 2.2 Add startup preflight `info` runtime logs for command, environment, and process-control stages.
- [x] 2.3 Add tests for cached process-control preflight and sanitized startup log summaries.

## 3. ACP Transport Cleanup

- [x] 3.1 Add transport lifecycle fields for process cleanup strategy, wrapper-prone detection, and unsupported cleanup diagnostics.
- [x] 3.2 Make transport close consume the cached process-control snapshot without running close-time capability detection.
- [x] 3.3 Preserve launch-plan command resolution, environment precedence, and ACP stdout single-owner behavior.
- [x] 3.4 Add focused ACP transport regression tests.

## 4. Validation

- [x] 4.1 Run focused runtime-platform-services and acp-transport tests.
- [x] 4.2 Run strict OpenSpec validation for `harden-acp-process-cleanup`.
