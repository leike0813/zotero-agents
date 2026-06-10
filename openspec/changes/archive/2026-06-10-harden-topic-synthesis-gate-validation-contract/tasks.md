## 1. Runtime Validator

- [x] Replace shallow payload schema validation with a dependency-free JSON Schema subset validator.
- [x] Preserve stage semantic validation for runtime-source checks.

## 2. Stage Contracts

- [x] Strengthen payload schemas for critical nested fields, enums, arrays, and strings.
- [x] Add semantic checks for stage data needed by final Host apply.
- [x] Render generated packages from `skills_src`.

## 3. Tests and Verification

- [x] Add split runtime regression cases for invalid payloads at multiple stages.
- [x] Keep valid create/update split runtime flows passing.
- [x] Run focused tests, TypeScript, and OpenSpec validation.
