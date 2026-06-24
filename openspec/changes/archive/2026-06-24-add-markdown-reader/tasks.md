## 1. Shared Renderer

- [x] Add shared Markdown renderer JS/CSS.
- [x] Add compatibility profiles for document, preview, transcript, synthesis, and standalone digest.
- [x] Add sanitizer, resource URL resolution, and outline helpers.

## 2. Markdown Reader

- [x] Add reader UI, host bridge, file reading, refresh, copy, search, outline, and system-default open.
- [x] Add markdown reader preference, localization, type declarations, and icon.

## 3. Existing Surfaces

- [x] Route Dashboard README and product preview through the shared renderer.
- [x] Route Synthesis report, artifact reader, and digest modal through the shared renderer.
- [x] Route ACP chat, ACP skill-run, and SkillRunner run dialog transcript Markdown through transcript profile.
- [x] Route literature-deep-reading digest modal through the shared standalone renderer source.

## 4. Validation

- [x] Add regression coverage for line breaks, blank lines, fallback rendering, sanitizer behavior, and reader interception.
- [x] Run targeted tests, TypeScript check, and formatting checks.
