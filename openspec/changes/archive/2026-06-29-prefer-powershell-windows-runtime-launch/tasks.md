## 1. Platform Launch Specification

- [x] 1.1 Extend runtime command resolution types with a cached launch specification.
- [x] 1.2 Build direct launch specs for non-Windows commands and executable paths.
- [x] 1.3 Include `.ps1` in Windows command preflight candidates.
- [x] 1.4 Apply Windows command suffix priority `.exe` > `.ps1` > `.cmd` > `.bat`.
- [x] 1.5 Promote resolved Windows shims to verified `.exe` targets when the rewrite is argument-preserving.
- [x] 1.6 Keep suffix-appropriate launch specs for remaining Windows shims.

## 2. Runtime Consumers

- [x] 2.1 Update ACP transport launch planning to consume platform launch specifications.
- [x] 2.2 Update ACP runtime dependency probes to consume platform launch specifications.
- [x] 2.3 Remove ACP transport's default `cmd.exe /d /c` shim wrapping logic.

## 3. Verification

- [x] 3.1 Update runtime platform service tests for candidate ordering, shim promotion, and cached launch specs.
- [x] 3.2 Update ACP transport tests for platform-owned launch planning and quoting.
- [x] 3.3 Run focused ACP transport tests, runtime platform tests, and TypeScript type checking.
