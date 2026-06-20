---
name: host-bridge-release-pipeline
description: Execute the Zotero-Skills project Host Bridge release steps after Host Bridge CLI, wrapper skill, broker capability, profile, or documentation changes. Use when Codex needs the exact commands for rendering Host Bridge surfaces, rebuilding local prebuilt CLI bundles, publishing the host-bridge/zotero-bridge-cli-bundle branch, and pushing it to the remote.
---

# Host Bridge Release Pipeline

Run this project-local workflow from the repository root:

```powershell
D:\Workspace\Code\JavaScript\Zotero-Skills
```

This is not the full CI gate. It is only the operational sequence for updating
the generated Host Bridge surface, local prebuilt CLI artifacts, and publish
branch after Host Bridge changes.

## Commands

1. Render Host Bridge surfaces:

```powershell
npm run render:host-bridge-surface
```

2. Rebuild local prebuilt CLI bundles.

Build the current host platform:

```powershell
npm run prebuild:zotero-bridge-cli
```

On Windows, also build Linux cross-target bundles:

```powershell
npm run prebuild:zotero-bridge-cli -- --platform=linux-x86
npm run prebuild:zotero-bridge-cli -- --platform=linux-x64
npm run prebuild:zotero-bridge-cli -- --platform=linux-arm
npm run prebuild:zotero-bridge-cli -- --platform=linux-arm64
```

Do not try to build macOS bundles locally on Windows. macOS bundles are produced
by GitHub CI macOS runners.

3. Dry-run the bundle publish:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-host-bridge-cli-bundle.ps1 -AllowDirty -DryRun
```

4. Publish and push the bundle branch when the user explicitly asked to publish
or push:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-host-bridge-cli-bundle.ps1 -AllowDirty -Push
```

Use `pwsh`, not Windows PowerShell. The publish branch is:

```text
host-bridge/zotero-bridge-cli-bundle
```

## Report

After running, report which commands ran, which platforms were rebuilt, the
published commit id printed by the publish script, and whether the branch was
pushed.
