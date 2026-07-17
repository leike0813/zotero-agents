## 1. Regression tests

- [x] 1.1 Add shared ACP Chat/ACP Skills empty-state model and renderer assertions for fixed chrome, placeholders, disabled controls, toolbar availability, and real Host Bridge state
- [x] 1.2 Add SkillRunner `session: null`, pre-ready selected session, stable layout, reply visibility, and DOM identity regression coverage
- [x] 1.3 Preserve sequence workflow subtitle and disconnected Chat runtime-option regression coverage

## 2. Shared empty-state projection

- [x] 2.1 Add localized short empty subtitles and internal label typings for all supported locales
- [x] 2.2 Project ACP Chat and ACP Skills source-aware empty banner, selectors, actions, indicators, and reply controls without synthesizing an owner
- [x] 2.3 Project explicit SkillRunner `session: null` as unavailable fixed chrome while preserving legacy/direct and pre-ready selected session semantics

## 3. Stable SkillRunner layout

- [x] 3.1 Remove the standalone SkillRunner empty section and keep the shared main/transcript/reply regions mounted for every snapshot
- [x] 3.2 Route the no-task message through the localized shared transcript empty state

## 4. Documentation and validation

- [x] 4.1 Update the Assistant sidebar UI SSOT with the unified empty-state contract
- [x] 4.2 Run focused tests, type/localization/lint/build checks, and strict OpenSpec validation
