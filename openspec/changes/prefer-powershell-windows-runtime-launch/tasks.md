## 1. Platform Launch Specification

- [x] 1.1 Extend runtime command resolution types with a cached launch specification.
- [x] 1.2 Build direct launch specs for non-Windows commands and executable paths.
- [x] 1.3 Build PowerShell launch specs for Windows `.cmd` and `.bat` shims with safe single-quote escaping.

## 2. Runtime Consumers

- [x] 2.1 Update ACP transport launch planning to consume platform launch specifications.
- [x] 2.2 Update ACP runtime dependency probes to consume platform launch specifications.
- [x] 2.3 Remove ACP transport's default `cmd.exe /d /c` shim wrapping logic.

## 3. Verification

- [x] 3.1 Update runtime platform service tests for cached PowerShell and direct launch specs.
- [x] 3.2 Update ACP transport tests for PowerShell wrapping and quoting.
- [x] 3.3 Run focused ACP transport tests, runtime platform tests, and TypeScript type checking.
