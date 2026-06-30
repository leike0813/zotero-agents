## 1. OpenSpec
- [x] Add proposal, design, tasks, and delta spec.
- [x] Validate the change with `npx openspec validate add-skillrunner-runtime-feed --type change --strict`.

## 2. Runtime Feed
- [x] Add the SkillRunner runtime feed resolver, defaults, normalization, cache fallback, and embedded fallback feed.
- [x] Add feed URL/cache prefs and clear the default local runtime version override.
- [x] Route managed local runtime planning/deployment through the resolver.
- [x] Treat installed-version mismatch as a deploy reason.

## 3. Feed Script
- [x] Add `scripts/update-skillrunner-runtime-feed.ts`.
- [x] Add an npm script for updating the feed.
- [x] Ensure repeated updates are stable and replace existing plugin ranges.

## 4. Verification
- [x] Add focused resolver, script, and local runtime tests.
- [x] Run the focused test set.
