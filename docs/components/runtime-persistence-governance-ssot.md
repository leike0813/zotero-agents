# Runtime Persistence Governance SSOT

Runtime persistence is plugin-managed data that can grow during normal use and can be safely monitored or cleaned by category. It is not plugin settings and it is not user-authored workflow or skill content.

Runtime Persistence Governance owns usage and integrity scans, category and
issue cleanup, and age-based retention. The runtime persistence module owns
root and path resolution, managed path policy, and late-bound filesystem
adapter selection. Governance calls those filesystem operations without
selecting an adapter itself.

## Root

The runtime persistence module resolves the root in this order:

- `ZOTERO_SKILLS_RUNTIME_ROOT`;
- the launcher-patched `runtimeRoot` plugin preference;
- `<Zotero DataDirectory>/zotero-agents`;
- `<TMPDIR|TEMP|TMP|Temp>/zotero-agents` when no durable root is available;
- `<cwd>/.zotero-agents`.

Runtime-scoped data lives under `runtime/` below this root: `{root}/runtime/logs`, `{root}/runtime/cache`, etc.

## Managed Categories

- `state/`: plugin runtime SQLite state, including SkillRunner ledger and ACP conversation rows.
- `runtime/logs/`: runtime log persistence.
- `runtime/acp/chat/workspace/`: the shared ACP Chat agent working directory (`agentWorkspaceDir`/`sessionCwd`) used by all ACP Chat conversations. Its root `AGENTS.md` contains a packaged plugin-managed policy block while preserving user content outside that block.
- `runtime/acp/chat/injected-skills-manifest.json`: the exact project-root and skill-id targets currently owned by ACP Chat injection; stale reconciliation may delete only these recorded whitelist directories.
- `runtime/acp/chat/conversations/`: plugin-private ACP Chat per-conversation storage; this is not the user-facing workspace and must not live inside `runtime/acp/chat/workspace/`.
- `runtime/acp/chat/runtime/`: plugin-private ACP Chat backend runtime state.
- `runtime/acp/skill-runs/`: ACP SkillRunner-compatible run workspaces.
- `runtime/cache/`: runtime caches.
- `runtime/tmp/`: temporary runtime files.
- `legacy/`: discovered old runtime locations surfaced for manual cleanup.

## Exclusions

The managed runtime cleanup surface must not include:

- backend/workflow settings and other plugin preferences;
- user `skills/` and `skills_builtin/`;
- user `workflows/` and `workflows_builtin/`;
- SkillRunner binary installation/runtime releases.

## Migration Rules

Migration is conservative. Existing runtime state may be copied into the new root, but legacy files are not deleted automatically. Legacy runtime directories are shown as cleanable only after the user explicitly chooses that cleanup category.

## Development Rule

Any new persistent runtime content that can grow over time must have a semantic
path and category in Runtime Persistence Governance and appear in preferences
usage monitoring.

`workspace` is reserved for directories where an agent process actually runs. Plugin-private persistence directories such as ACP Chat `conversations/` and `runtime/` must not be described as workspaces in user-facing UI.

## Async Runtime File I/O

Runtime text append and indexed text range reads have one runtime-owned I/O
boundary:

- Node uses `fs/promises` behind the same ordered append contract.
- Zotero append uses per-path serialized, surrogate-safe chunks with
  `IOUtils.writeUTF8(..., { mode: "appendOrCreate" })`.
- Zotero indexed ranges use the packaged runtime file range worker. One bounded
  physical batch opens the source once and returns one packed transferable byte
  buffer plus a length vector.
- Complete and stale-tail transcript index recovery scans UTF-8 bytes in fixed
  chunks and applies valid events to one ordered builder.

Runtime persistence must not restore synchronous Components streams or
whole-file read/rewrite and byte-offset/string-offset fallbacks. Missing worker
or asynchronous I/O capabilities are structured runtime errors. The worker is
terminated only after ACP and runtime-log persistence drains during controlled
plugin shutdown.

## Runtime Filesystem Adapter Ownership

`src/modules/runtimePersistence.ts` is the sole owner of cross-runtime
filesystem adapter selection. Workflow modules call its semantic operations;
they do not select between `IOUtils`, `OS.File`, Node filesystem APIs, or
Components streams themselves. Adapter lookup remains late-bound on each
operation so a cached Workflow Host projection cannot retain stale runtime
globals.

The module exposes two failure semantics intentionally:

- tolerant operations support cache, cleanup, and optional persistence paths
  where a missing file or unavailable adapter has an established neutral result;
- strict operations surface missing paths and unavailable adapters for caller
  contracts that promise a completed read, write, or directory creation.

Workflow Host file reads, writes, and directory creation use the strict
semantics. Existing tolerant persistence callers retain their current behavior.
`Workflow Input Materialization` owns provider-input naming, exclusivity of text
versus bytes, uniqueness, and placement under
`runtime/tmp/workflow-inputs/`; it delegates the actual write to runtime
persistence.

## Safe Operation Paths

`assertRuntimePathBudget` in runtime persistence validates complete operation
paths, independently of managed-relative-path validation and inventory warnings.
Windows-shaped paths use Windows limits even during a Node investigation on
another OS. The default `interop` policy uses 259 UTF-16 units for files and
247 for directories, excluding the terminating NUL. Ordinary filesystem
operations use `native`: Windows checks the extended representation plus NUL
against 32767 UTF-16 units. Components fit 255 UTF-16 units on Windows and
255 UTF-8 bytes on POSIX; generated portable attachment names retain their
separate UTF-8 cap. POSIX totals are bounded in bytes by the runtime's platform
policy. Relative paths include the current working directory in their budget;
an unresolved absolute basis cannot authorize a write. Gecko native calls use
`PathUtils.toExtendedWindowsPath` consistently for source, destination, worker,
and derived paths. Extension is private to the I/O adapter; enumerated paths
return in ordinary form and are adapted again on the next I/O. Device namespaces
are refused. Long final symlink/junction targets retain the host's limitations.

`reserveRuntimeTemporaryDirectory` reserves a bounded exclusive directory and
validates known relative destinations and file-leaf headroom. It holds temporary
ownership until cleanup or release to the caller's existing retention policy.
Interop reservations prefer their managed category root and can fall back to
the system temporary `.zs-t` namespace. Each fallback records its runtime-root
owner in `.owner.json`; usage, cleanup and retention include only matching
non-symlink owned directories. Active reservations prevent temporary cleanup.
Generated resource filenames use short ordinals and extensions independently of
display names, run IDs and slot IDs. Published outputs keep their existing
retention ownership. Provider-input materialization releases to existing
temporary retention after writing; it does not delete input at hook completion.
Result ZIP readers retain extraction ownership until their caller disposes the
reader. Workflow result handles and Host Bridge apply paths dispose readers on
completion or failure. Compatibility retention removes the complete owned
directory only when all its files, including the ownership marker, have expired.

Native write, copy, move, append, and directory-creation entry points enforce
the budget before effects. Directory moves inspect every descendant destination
with fixed entry/depth bounds; an incomplete inspection cannot authorize a move.
Atomic text, binary, and ZIP output uses an exclusively reserved short sibling
directory and a fixed internal leaf, not a target basename plus a suffix.
Tree-copy staging and backup paths are planned before old content is moved.
Reservation failure never transfers cleanup ownership of an existing directory.
Tree-copy promotion is preflighted before backup. Unknown inspection or move
outcomes retain possible backups; tolerant existence probes never authorize
their deletion. Inventory scan warnings remain distinct from bounded mutation
admission.

Workflow file calls and archive operations expose budget failures as
`resource_limited` with numeric length evidence rather than sensitive paths.
ZIP extraction validates every known destination before extracting the first
entry; the Node bundle reader preflights the same central/local member names
that its external extractor will consume. Unverifiable filename encodings,
noncanonical member destinations, and symlink entries are refused there.

New upload and attachment staging filenames retain extensions and Unicode
within both the normal filename cap and the directory's remaining budget.
Display names remain independent. Exact existing output paths are not silently
renamed. Short-path consumers use owned compatible copies. Completed external
outputs are copied to a native sibling on the destination volume before atomic
promotion; cross-volume copying never replaces the old target directly. When
no compatible candidate has sufficient space, the operation fails safely
without migrating data or changing an OS setting. Zotero attachment storage,
fulltext caches, companions and sync retain their own downstream preflight.

Absolute-length inventory warnings remain observational. They do not bypass
the operation checks or promise that a user-selected deep root is writable.
See `docs/components/attachment-file-lifecycle.md` for native storage and
workflow recovery ownership.

## Attachment Temporary Ownership

Stored-attachment preparation and stored mutation hold runtime temporary
ownership while staged content or replacement recovery files may be needed.
Host Bridge upload bytes are owned under `runtime/tmp/host-bridge-uploads/`;
an upload lease keeps them available through approval and execution. Runtime
temporary-category cleanup must report in-use and leave the category intact
while either ownership is active. Upload expiry or consumption removes only
bytes owned by the upload registry; registered downloads of Zotero-managed
files and workflow artifacts never transfer ownership of their source files.
See `docs/components/attachment-file-lifecycle.md` for the complete lifecycle.
