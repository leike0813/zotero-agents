## 1. OpenSpec And Documentation

- [x] 1.1 Create proposal, design, and delta specs for plugin skill registry and ACP-compatible contract
- [x] 1.2 Add an SSOT document for plugin-side skill assets and ACP SkillRunner-compatible governance
- [x] 1.3 Link the SSOT from the developer guide or component index

## 2. Skill Registry

- [x] 2.1 Add root `skills_builtin/` and `skills/` placeholders
- [x] 2.2 Implement plugin skill registry discovery, basic validation, source precedence, diagnostics, and checksums
- [x] 2.3 Update build assets so built-in skills are packaged

## 3. Tests And Validation

- [x] 3.1 Add registry tests for valid skills, invalid candidates, user-over-builtin precedence, and checksum stability
- [x] 3.2 Run OpenSpec validation for the change
- [x] 3.3 Run targeted registry tests and `npx tsc --noEmit`
