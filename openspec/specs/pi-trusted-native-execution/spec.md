# pi-trusted-native-execution Specification

## Purpose
Built-in Pi exposes a bounded, policy-mediated set of workspace file and native command tools while preserving workspace identity and durable owner evidence.

## Requirements

### Requirement: Tool catalogs reflect runtime proof

Trusted Native SHALL expose `read`, `bash` or `powershell`, `edit`, and `write` only when their runtime prerequisites are proven. Restricted Broker SHALL expose `read`, `edit`, `write`, `grep`, `find`, and `ls` without subprocess execution. Missing file identity inspection SHALL hide affected file tools; missing process capability SHALL hide Shell. Availability SHALL NOT grant authorization.

#### Scenario: Shell adapter unavailable
- **WHEN** the runtime cannot prove a sealed native Shell adapter
- **THEN** the runtime receipt omits Shell and the restricted file broker remains available where path proof succeeds

### Requirement: File tools bind canonical workspace resources

Every file operation SHALL validate lexical and resolved containment in the admitted workspace before effect and SHALL reject links or reparse points that cannot be safely resolved. Classification SHALL claim canonical resources before Gateway policy and scheduling. `read` SHALL honor one-based offset and limit with 2000-line and 50 KiB visible bounds; binary input SHALL NOT be returned as base64 text. `write` SHALL create parent directories and replace complete content; `edit` SHALL replace exactly one unique occurrence and fail on ambiguity.

#### Scenario: Path resolves outside workspace
- **WHEN** an admitted file path resolves through a link outside the workspace
- **THEN** the tool fails before reading or writing the target

#### Scenario: Ambiguous edit
- **WHEN** the requested old text occurs more than once
- **THEN** no file content changes

### Requirement: Restricted search is bounded and in process

`grep`, `find`, and `ls` SHALL traverse only the verified workspace, honor ignore rules, and stop at their respective 100-match, 1000-path, and 500-entry bounds. Visible text SHALL stay within 2000 lines and 50 KiB. Search SHALL NOT start a subprocess.

#### Scenario: Large workspace search
- **WHEN** eligible results exceed a tool bound
- **THEN** the tool returns a bounded result with truncation evidence

### Requirement: Shell runs with a sealed environment and bounded lifecycle

Shell SHALL start only a resolved native shell with a replaced minimal environment and sanitized executable lookup. It SHALL stream full output to managed scratch with a 50 MiB hard bound, expose only a 2000-line and 50 KiB tail, enforce a default 15-minute and maximum 60-minute timeout, and distinguish confirmed exit from uncertain descendant termination. Uncertain command structure SHALL claim opaque execution and conservative effects.

#### Scenario: Dynamic shell syntax
- **WHEN** command text contains a pipe, redirection, substitution, nested interpreter, or another uncertain construct
- **THEN** its policy classification is opaque execution before approval or start

#### Scenario: Process cannot be proved stopped
- **WHEN** timeout or cancellation cannot establish descendant termination
- **THEN** the outcome reports unknown effect certainty and is not automatically replayed

### Requirement: Owner manages materialized files and generated output

The owner SHALL atomically record a per-owner managed-file manifest. `materializeOrReuse` SHALL reuse a managed copy for the same canonical source revision, size, and copy-time digest even if the agent edits that copy; a changed source SHALL create a new generation and preserve the old one. Missing recorded files SHALL invalidate reuse. Generated output promotion SHALL use an atomic commit boundary. Source paths SHALL NOT enter durable manifest records. A generated file SHALL be limited to 256 MiB, newly committed files to 512 MiB per call, and retained files to 2 GiB per owner.

#### Scenario: Agent edits its managed copy
- **WHEN** the source fingerprint remains unchanged but the managed copy differs
- **THEN** later materialization reuses the recorded managed path

#### Scenario: Source changes
- **WHEN** source revision, size, or digest changes
- **THEN** a new managed path is returned while the previous generation remains