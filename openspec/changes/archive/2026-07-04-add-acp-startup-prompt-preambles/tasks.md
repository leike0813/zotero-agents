## 1. OpenSpec

- [x] 1.1 Create the `add-acp-startup-prompt-preambles` change.
- [x] 1.2 Add proposal, design, task list, and delta spec.

## 2. Runtime Prompt Templates

- [x] 2.1 Add ACP Chat and ACP Skills startup preamble templates.
- [x] 2.2 Register the templates in the runtime prompt template SSOT.
- [x] 2.3 Add a shared helper for rendering and prepending preambles.

## 3. Runtime Integration

- [x] 3.1 Inject the ACP Chat preamble only on the first prompt of an empty
  conversation.
- [x] 3.2 Inject the ACP Skills preamble only on the initial run prompt.

## 4. Verification

- [x] 4.1 Cover template loading and rendering.
- [x] 4.2 Cover ACP Chat first-turn injection and non-repetition.
- [x] 4.3 Cover ACP Skills initial prompt injection and repair exclusion.
- [x] 4.4 Run focused tests and OpenSpec validation.
