## 1. Regression Coverage

- [x] 1.1 Add debug-probe contract tests for existing-parent input, bundle request construction, and strict missing-parent behavior
- [x] 1.2 Add ACP-compatible and SkillRunner integration coverage that keeps two parent units isolated through attachment apply

## 2. Workflow Implementation

- [x] 2.1 Add the debug-only existing-parent bundle workflow and strict parent-bound request builder
- [x] 2.2 Add a strict existing-parent wrapper that validates the request target before delegating to the unchanged shared bundle apply implementation

## 3. Package Integration

- [x] 3.1 Register the workflow in the debug-probe package and builtin content manifest
- [x] 3.2 Document the existing-parent probe and its single-artifact bundle contract

## 4. Verification

- [x] 4.1 Run focused debug-probe, provider integration, and TypeScript checks
- [x] 4.2 Validate the OpenSpec change and confirm all implementation tasks are complete
