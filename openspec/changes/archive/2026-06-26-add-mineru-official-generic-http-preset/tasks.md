## 1. OpenSpec Artifacts

- [x] 1.1 Create proposal, design, delta spec, and implementation tasks.

## 2. Generic HTTP Preset Model

- [x] 2.1 Add a Generic HTTP preset SSOT module with the MinerU Official preset.
- [x] 2.2 Expose Generic HTTP presets through the Backend Manager snapshot.
- [x] 2.3 Add host actions for confirming Generic HTTP presets and opening preset links.

## 3. Backend Manager UI

- [x] 3.1 Add a Generic HTTP preset subwindow matching the ACP preset interaction style.
- [x] 3.2 Render localized preset notes and external links through host actions.
- [x] 3.3 Apply preset token placeholders to the token input without setting authToken.
- [x] 3.4 Preserve manual Generic HTTP add behavior and duplicate-id protection.

## 4. Localization And Docs

- [x] 4.1 Add Generic HTTP preset strings to all addon locales.
- [x] 4.2 Update MinerU setup docs to use the preset and `600000` ms timeout.
- [x] 4.3 Rebuild or check generated help docs after source docs change.

## 5. Tests And Validation

- [x] 5.1 Extend Backend Manager regression tests for preset metadata, snapshot exposure, UI wiring, duplicate guard, and placeholder behavior.
- [x] 5.2 Run targeted Backend Manager tests.
- [x] 5.3 Run help docs check.
- [x] 5.4 Run TypeScript type check.
