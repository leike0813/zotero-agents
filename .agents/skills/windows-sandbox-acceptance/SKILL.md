---
name: windows-sandbox-acceptance
description: Run isolated or offline Zotero/XPI acceptance in Windows Sandbox for this repository. Use when preparing the sandbox, staging local inputs, diagnosing guest prompts or failures, or collecting acceptance receipts.
---

# Windows Sandbox Acceptance

Use Windows Sandbox when a Windows Zotero test needs an isolated profile or no
external network while the host must stay online. For an offline run, put
`<Networking>Disable</Networking>` in the `.wsb` configuration. Keep source,
candidate XPI, host archive, tools, and caches as read-only mapped inputs; map
one separate output directory writable so evidence survives sandbox shutdown.
The compatibility matrix and current package scripts define the test command
and required versions. Derive candidate identities from the current task.

## Prepare the host and sandbox

1. Confirm `C:\Windows\System32\WindowsSandbox.exe` exists and the feature is
   usable. Enabling `Containers-DisposableClientVM` needs administrator access;
   DISM exit code `3010` means a reboot is still required. Arrange that reboot
   before treating the feature as ready.
2. Check `WindowsSandboxRemoteSession.exe` for an existing sandbox. Only one
   instance runs at a time. `WindowsSandbox.exe` is a launcher and may exit
   while the remote-session process and guest remain alive. Close an old test
   guest through its window, confirm the discard prompt, and wait for the
   remote-session process to exit before starting another.
3. Create a fresh output directory per attempt. Check that every mapped host
   path exists. Use short guest paths for the checkout, build root, cache root,
   and run root; deep Windows run roots can exceed path limits before the
   sidecar reaches readiness. Keep writable output outside any read-only input
   mapping. Prefer narrow, nonoverlapping mappings over the entire workspace.
4. For a pinned source, make a dedicated shallow **bare** Git seed on the host
   with enough history to contain the requested SHA. Verify the SHA is present,
   map the seed read-only, then clone to a writable guest directory and check
   out the SHA detached. A separate Git directory configured with a relative
   `core.worktree` is unsuitable as a seed unless that worktree is also mapped
   at the expected relative path. Assert `git status --porcelain` is empty and
   set the runner's source SHA/ref environment from the pinned source.

A minimal offline mapping has this shape; fill paths from the current run:

```xml
<Configuration>
  <Networking>Disable</Networking>
  <MappedFolders>
    <MappedFolder><HostFolder>HOST_INPUT</HostFolder><SandboxFolder>C:\Input</SandboxFolder><ReadOnly>true</ReadOnly></MappedFolder>
    <MappedFolder><HostFolder>HOST_OUTPUT</HostFolder><SandboxFolder>C:\Output</SandboxFolder><ReadOnly>false</ReadOnly></MappedFolder>
  </MappedFolders>
  <LogonCommand><Command>powershell.exe -NoProfile -ExecutionPolicy Bypass -File C:\Input\run.ps1</Command></LogonCommand>
</Configuration>
```

## Stage dependencies without guest downloads

- Map Node and Git installations read-only. Map the host `node_modules` into an
  existing guest user directory whose **last path segment is `node_modules`**;
  use `C:\Users\WDAGUtilityAccount\Desktop\node_modules` with the default
  Sandbox account. Junction the detached checkout's `node_modules` to that
  path. A map whose final segment has another name breaks Node's normal sibling
  lookup. `NODE_PATH` helps CommonJS but does not fix ESM package imports. If
  the guest rejects a destination such as `C:\node_modules`, use an existing user
  directory instead.
- Stage the official Zotero archive and pinned XPI locally. Verify the XPI
  SHA-256 before invoking `test:zotero:compatibility:prepare` or `:run`; pass a
  short explicit build root and archive cache root. The runner must never need
  to fetch Zotero during an offline run.
- The installed `zotero-plugin-scaffold` tester may fetch `chai.js` into
  `.scaffold/cache/chai.js`. Inspect its current library resolution before the
  run and stage the needed test-library cache into the writable checkout.
- The System E2E runner's `resolveCurrentHostBridgeCli()` builds a CLI with
  Cargo when its fingerprinted cache is absent. Compute the current CLI build
  fingerprint from the checked-out source. If reusing a host-built cache,
  stage the matching `zotero-bridge.exe` and `ready.json` into the guest's
  local `%TEMP%/zotero-agents-host-bridge-cli-tests/<fingerprint>/` layout.
  Copy the executable off the mapped share before use. Run `--version` locally
  before Zotero E2E. Exit status `0xC0000135` indicates a missing runtime DLL:
  inspect PE imports, and place the matching-architecture runtime beside the
  guest CLI. For an MSVC build importing `VCRUNTIME140.dll`, stage that DLL as
  a local test dependency outside the candidate XPI.

## Run and observe

1. For offline evidence, check direct external access both before and after
   the test with proxy use disabled and a short timeout. Pair those observations
   with the `.wsb` networking setting. Windows PowerShell 5.1 may need
   `Add-Type -AssemblyName System.Net.Http` before `HttpClientHandler` exists.
2. Run the existing compatibility `prepare` and `run` scripts with the pinned
   XPI. `Start-Transcript` alone does not reliably capture child-process
   output. Redirect each native command's streams to an output log, temporarily
   use `$ErrorActionPreference = 'Continue'` around that command so normal Git
   stderr such as `Cloning into...` does not terminate PowerShell 5.1, then
   restore `Stop` and check `$LASTEXITCODE`.
3. Watch the sandbox window if the receipt and logs stop advancing. The outer
   accessibility tree may expose only the RDP canvas, not guest dialogs;
   capturing the `WindowsSandboxRemoteSession` window with Win32
   `PrintWindow` reveals guest prompts. A Node.js Windows Security alert can
   pause an otherwise healthy loopback test even with sandbox networking
   disabled. Cancel that guest-only inbound-access prompt, then verify the
   local test actually resumes. Keep host firewall settings untouched.
4. On failure, copy the compatibility `receipt.json` and its referenced runner
   stdout/stderr logs to the mapped output before closing the sandbox. A
   nonzero runner exit often still has a useful receipt. Compare timestamps or
   use attempt-specific output paths so an old `failure.json` is not mistaken
   for the current attempt.

## Count the result

Read the raw compatibility receipt, its Run Manifest, and installed-runtime
evidence. Require the expected clean source SHA, pinned XPI SHA-256, observed
Zotero version, `passed` receipt, complete cleanup, complete Run Manifest with
every required case/result/health/cleanup passed, and the expected installed
bundle ID and build fingerprint. For offline work, also require the sandbox
network setting and failed direct-Internet probes before and after the run.
Treat missing, stale, or mixed-identity evidence as pending or failed; never
infer success from the command's exit code alone. Copy verified evidence to the
host before closing the guest. Closing Windows Sandbox discards all remaining
guest files.
