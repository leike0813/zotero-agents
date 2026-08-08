## 1. Baseline and contracts

- [x] 1.1 Record the fixed semantic baseline, approved generated-path deletion inventory, 159-file mapping, and all instruction-depth warning dispositions.
- [x] 1.2 Add focused failing tests for surface closure, addon generation/pruning, relocation-aware baseline validation, and bundle manifest integrity.

## 2. Surface rendering and package ownership

- [x] 2.1 Move Minimum and Generic generated roots in `host-bridge/surfaces.json` and enforce their nesting and exact inherited closure in the surface model.
- [x] 2.2 Refactor the renderer to atomically generate and prune one addon bundle root, emit the v1 integrity manifest, and reuse the same in-memory bytes for hosted materialization.
- [x] 2.3 Update every current Host Bridge path consumer and CLI installer lookup to resolve the new generated roots without retaining a second generated copy or compatibility layer.
- [x] 2.4 Add baseline root mapping support to the package validator and prove all governed files retain reference reachability and relative depth.

## 3. XPI build and release gates

- [x] 3.1 Explicitly include the complete Host Bridge Skill bundle in plugin assets and replace the native-only gate with a complete XPI Host Bridge asset validator.
- [x] 3.2 Cover valid and synthetic missing, extra, duplicate, traversal, digest, and CLI-identity failure cases for directory and built-XPI validation.
- [x] 3.3 Reclassify addon Host Bridge bundle changes as plugin/Host Bridge candidates while leaving remaining `skills_builtin` content package classification generic.
- [x] 3.4 Remove Host Bridge receipt requirements from Content Package preparation/publication and add the matching complete receipt plus built-XPI gate to plugin release.
- [x] 3.5 Bump plugin/package lock metadata to `0.9.0` and Content Package metadata to `0.8.0` requiring plugin `>=0.9.0`.

## 4. Runtime materialization and registry

- [x] 4.1 Add tests for packaged and development asset reads, transactional first materialization, digest reuse, failed replacement, and startup ordering.
- [x] 4.2 Replace the unused built-in sync module with a manifest-validating Host Bridge plugin Skill bundle materializer and invoke it before the first workflow registry rescan.
- [x] 4.3 Add `xpi-bundled` registry entries, derive reserved IDs from the validated surface closure, exclude competing sources with diagnostics, and forbid reserved-source fallback.
- [x] 4.4 Preserve ordinary Skill precedence and prove registry, workflow dependencies, ACP Chat, ACP Skills, Host Bridge agent runs, and SkillRunner `local-package` work without a Content Package.

## 5. Catalog and recovery identity

- [x] 5.1 Persist the bundle aggregate and CLI identity in shared catalog metadata while retaining selected Skill checksums in catalog identity.
- [x] 5.2 Persist the bundle identity with recoverable ACP Chat and ACP Skills state and reject mismatched recovery with `host_bridge_plugin_skill_bundle_identity_changed`.
- [x] 5.3 Add focused catalog and recovery tests covering identity stability, identity change, and missing-bundle behavior.

## 6. Generated relocation and documentation

- [x] 6.1 Render the exact seven Skill trees and manifest under `addon/content/host-bridge-skills`, remove the seven old generated directories, and prove Content Package archives contain none of them.
- [x] 6.2 Update workflow, Host Bridge agent-surface, developer, and release-coordinator current-state documentation and remove stale old-path references.

## 7. Verification

- [x] 7.1 Run strict OpenSpec validation and focused Node/Mocha tests for all changed contracts.
- [x] 7.2 Run Host Bridge content, semantic parity/root-map, surface, SSOT, TypeScript, ESLint, and Prettier gates; record all 28 advisory dispositions and four zero semantic counts.
- [x] 7.3 Build the plugin, inspect the final XPI inventory and digests, and verify stable/beta/dev Content Package inventories contain zero reserved Host Bridge Skills.
