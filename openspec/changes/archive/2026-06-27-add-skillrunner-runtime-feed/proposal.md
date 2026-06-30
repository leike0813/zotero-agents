# Change: Add SkillRunner Runtime Feed

## Summary
Move the managed local SkillRunner runtime target version out of plugin code and into a small remote feed. The local SkillRunner backend is a fallback path for users who do not want to manage an external backend, so the plugin should choose the matching runtime automatically without exposing version or channel choices.

## Motivation
The managed local runtime currently uses a version hardcoded in plugin defaults and runtime manager fallback logic. Updating the recommended SkillRunner version therefore requires a plugin release even when only the backend runtime recommendation changes. A single remote feed lets the project update the local fallback backend independently while keeping the user workflow as one-click prepare/start.

## Scope
- Add a single SkillRunner runtime feed with GitHub primary and Gitee fallback URLs.
- Match plugin version ranges to SkillRunner release tags.
- Cache the last successfully fetched feed and use an embedded fallback if remote sources are unavailable.
- Keep `skillRunnerLocalRuntimeVersion` as a hidden explicit override with an empty default.
- Add a script that updates the feed JSON for a plugin range and SkillRunner version.

## Out of Scope
- Stable/beta/dev runtime feed channels.
- Zotero version, SkillRunner API version, or remote backend compatibility checks.
- User-facing version selection UI.
