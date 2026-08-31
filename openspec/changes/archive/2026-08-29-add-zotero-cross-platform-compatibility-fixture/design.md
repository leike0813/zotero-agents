## Context

See `proposal.md` for motivation. The repository's Zotero scaffold always rebuilds the production add-on and assumes a developer-installed host, while the requested matrix needs one canonical artifact, exact downloadable host versions, independent sessions, and formal XPI installation. The plugin runtime cannot use Node.js APIs; all host acquisition and process control must remain in external scripts. Existing lite/full suites and their sequential full runner remain the test-membership SSOT.

## Goals / Non-Goals

**Goals:**

- Make a fresh GitHub-hosted Windows or Linux runner sufficient to execute one exact Zotero target without manual installation.
- Keep target metadata, gate selection, downloads, and receipt identity derivable from one manifest.
- Make acquisition, session ownership, and receipt formation deep modules with narrow, testable contracts.
- Support Zotero 10 without scattering version-string comparisons through production modules.

**Non-Goals:**

- Reimplementing the project's behavioral suites or changing their membership.
- Testing every Zotero patch release or Linux distribution.
- Promoting macOS evidence to a release gate before it has maintainer-observed stability.
- Adding runtime compatibility branches for APIs the plugin does not use.

## Decisions

### One declarative compatibility matrix

`test/zotero/compatibility-matrix.json` owns exact releases, supported platforms, archive metadata, expected executable paths, and policy tags. A planner converts the manifest plus a `pull-request`, `main`, `release`, or local selection into execution cells. CI consumes planner output instead of restating versions in YAML. This prevents version and policy drift.

Alternative: hard-code each CI cell and duplicate a local script table. Rejected because digests, URLs, and gate policy would have multiple owners.

### Acquisition publishes only validated immutable hosts

Archives are fetched from immutable official release URLs and cached by declared SHA-256. Every cache hit is rehashed. The acquisition layer lists and validates archive entries before extraction into a fresh staging directory, validates the expected executable and `application.ini` version, then atomically publishes the extracted host baseline. Each segment launches a run-local copy of that baseline so Zotero updates or other installation-directory writes cannot mutate shared state. Platform adapters use built-in OS tools: PowerShell/.NET or system tar on Windows, tar on Linux, and `hdiutil`/`ditto` on macOS. No npm dependency is added.

Alternative: cache extracted application directories directly. Rejected because partial or locally mutated installations are harder to authenticate.

### Session ownership is explicit

Each cell receives a run directory containing a run-local host copy, profile, data, resource, runtime, logs, receipt, and an ownership record. The session object owns all child processes, allocated ports, deadlines, and cleanup. It tries protocol/application shutdown first, then terminates only recorded process trees. Global Zotero process-name termination is forbidden. A machine-wide lock serializes GUI hosts in one desktop session; CI cells remain parallel because they run on separate VMs.

### Resource generation and host launch are separated from add-on building

The normal build job produces the canonical add-on directory and XPI once. The compatibility fixture generates only the test resource/bundle for the selected existing suite and starts the acquired Zotero executable directly. Existing reporter protocol and suite membership are reused. This avoids the scaffold's unconditional production rebuild in each target.

### Formal XPI smoke is a distinct mode

The smoke resource calls Zotero's privileged add-on manager installation API with the canonical XPI, waits for `Zotero.ZoteroSkills.data.alive` and `initialized`, disables/uninstalls it, then waits for `Zotero.ZoteroSkills` removal. The mode has its own phases in the shared receipt rather than pretending to be a behavioral suite.

### Supported Zotero major parsing has one owner

A plugin-safe shared module parses `Zotero.version` into `7 | 9 | 10 | "unknown"`. Existing runtime compatibility seams consume that type. The manifest declares `10.*` as supported, while unrecognized future majors remain explicit unknowns.

### Collection-tree pluralism terminates at the broker

The broker normalizes the current selection to ordered discriminated JSON DTOs. Zotero 10 plural APIs are detected by capability; Zotero 7/9 fall back to their available single-row representation. `libraryIds` is always plural, `libraryId` is populated only when unique, and `currentCollection` only for one selected collection. Workflow Host and MCP receive explicit projections and never see raw rows or host-version branches.

## Risks / Trade-offs

- [Official fixed-version URLs or archives change] → Pin SHA-256, fail closed, and require a reviewed manifest update.
- [GitHub GUI runners are slower or flaky] → Use per-phase timeouts, preserve diagnostics, cache only authenticated archives, and keep full segments sequential within each cell.
- [macOS add-on automation behaves differently by architecture] → Collect both architecture receipts without gating until maintainers can review repeated evidence.
- [Scaffold internals change] → Own only the narrow test-resource generation/launch adapter and test its observable command/resource contract.
- [Zotero tree-row internals vary] → Normalize by capability and bounded row facts; unsupported shapes remain special/unknown JSON refs rather than escaping raw objects.

## Migration Plan

1. Land fixture contracts, unit tests, manifest, and local CLI without enabling CI gates.
2. Extend Zotero 10 runtime contracts and the plural current-view DTO; run existing Node and Zotero-compatible tests.
3. Add CI planner jobs and artifacts, with Windows/Linux blocking and macOS explicitly non-blocking.
4. Update current support/testing documentation and generated help through its source generator.

Rollback consists of removing the CI workflow jobs while retaining receipts from failed runs. The manifest and runtime compatibility changes can be reverted independently only if Zotero 10 support is also withdrawn from the public manifest.
