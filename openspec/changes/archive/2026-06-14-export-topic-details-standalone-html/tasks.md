# Tasks

- [x] Add delta specs for Topic Details HTML export, standalone Synthesis export mode, and localization governance.
- [x] Replace the Topic Details `Copy Summary` UI action with a localized `Export Topic HTML` host command.
- [x] Add host-side standalone HTML export generation with topic detail, concepts, graph, digest, asset, and i18n embedding.
- [x] Add standalone boot support in the Synthesis Workbench app, including embedded digest resolution and readonly subgraph mode.
- [x] Add locale keys across `en-US`, `zh-CN`, `ja-JP`, and `fr-FR`, and update localization governance as needed.
- [x] Extend focused Synthesis UI tests for the export action, standalone boot, embedded digests, readonly graph controls, and concept overlay data.
- [x] Run localization governance, focused Synthesis UI tests, TypeScript, and touched-file Prettier checks.
- [x] Refine standalone export packaging so the HTML renders only Topic Details chrome and exposes the citation graph as an offline tab with readonly filters and layout controls.
- [x] Persist standalone Topic Details HTML as a fixed topic-level asset and make export copy that asset, rebuilding only when the asset is missing or the topic signature changed.
