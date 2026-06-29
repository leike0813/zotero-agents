## 1. Kilo Preset

- [x] 1.1 Add regression coverage for Kilo npx package metadata and generated npx backend profile.
- [x] 1.2 Update the Kilo ACP preset to expose `@kilocode/cli@latest` through the existing npx launch option while preserving local launch as the default.

## 2. Hermes Runtime Dependency Wrapping

- [x] 2.1 Add regression coverage proving Hermes runtime dependency resolution keeps the configured backend command unchanged after a successful uv dependency probe.
- [x] 2.2 Update ACP runtime dependency planning so Hermes reports runtime dependency wrapping as bypassed and non-Hermes backends keep the existing uv wrapping behavior.

## 3. Verification

- [x] 3.1 Run focused tests for ACP backend presets and ACP SkillRunner-compatible runtime dependency wrapping.
- [x] 3.2 Run OpenSpec validation for `fix-acp-python-backend-uv-wrapping`.
