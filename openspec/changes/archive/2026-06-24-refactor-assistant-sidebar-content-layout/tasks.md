## 1. OpenSpec Artifacts

- [x] 1.1 Create proposal, design, assistant-sidebar-ui delta spec, and task artifacts.
- [x] 1.2 Validate the change with `openspec validate refactor-assistant-sidebar-content-layout --strict`.

## 2. Static Resource Layout

- [x] 2.1 Move Assistant workspace and panel-local sidebar assets to `addon/content/sidebar`.
- [x] 2.2 Move Assistant panel shared JS/CSS assets to `addon/content/shared/assistant`.
- [x] 2.3 Move markdown/math/highlight vendor assets to `addon/content/shared/vendor`.

## 3. Runtime and HTML References

- [x] 3.1 Update Assistant sidebar and run-dialog chrome URLs to use `content/sidebar`.
- [x] 3.2 Update synthesis packaged vendor reads to use `content/shared/vendor`.
- [x] 3.3 Update dashboard, Markdown Reader, Synthesis, harness, and sidebar HTML references to the new shared/sidebar paths.

## 4. Tests and Verification

- [x] 4.1 Update static path assertions and file reads in targeted sidebar/vendor tests.
- [x] 4.2 Run targeted Mocha tests for sidebar, run dialog, markdown renderer, and ACP UI smoke coverage.
- [x] 4.3 Run `npx tsc --noEmit`.
- [x] 4.4 Scan active source/addon/test files for stale `content/dashboard/vendor` and dashboard-owned sidebar paths.
