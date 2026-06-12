# ACP/SkillRunner Contract Parity

## Overview

This subsystem ensures that ACP agent skill runs satisfy the same contract
constraints as SkillRunner backend jobs. It spans skill discovery, materialization,
schema validation, output convergence, and result-file fallback — the full
pipeline from skill directory scan to the final result envelope.

Eight modules implement this pipeline:

| Module | File | Phase |
|--------|------|-------|
| Skill Registry | `src/modules/pluginSkillRegistry.ts` | Scan, validate, register |
| Skill Materializer | `src/modules/acpSkillMaterializer.ts` | Orchestrate materialization |
| Thin Proxy Materializer | `src/modules/acpThinProxySkillMaterializer.ts` | Generate proxy SKILL.md |
| Reference Rewriter | `src/modules/acpSkillReferenceRewriter.ts` | Path rewriting + patch blocks |
| Schema Asset Resolver | `src/modules/acpSkillSchemaAssets.ts` | Input/parameter schema resolution |
| Output Convergence | `src/modules/acpSkillOutputConvergence.ts` | JSON extraction, classification, result write |
| Output Validator | `src/modules/acpSkillOutputValidator.ts` | Final payload schema check + repair prompt |
| Result File Fallback | `src/modules/acpSkillResultFileFallback.ts` | Disk-based result recovery |

## Pipeline Overview

```text
Skill Directory Scan
  ↓
Registry Snapshot (entries + diagnostics)
  ↓
Resolve Requested Skill
  ↓
Build Shared Skill Catalog
  ↓
Materialize Proxy Skills
  ├── thin proxy (default): rewrite references + inject instruction blocks
  └── Hermes family: skip materialization
  ↓
Schema Asset Resolution (input / parameter)
  ↓
ACP Prompt Session (run execution)
  ↓
Output Convergence
  ├── extract JSON candidate from assistant text
  ├── classify: final / pending / invalid
  └── if invalid → Result File Fallback
  ↓
Output Schema Validation (final check)
  ↓
Write Result Envelope
```

---

## Skill Registry

`src/modules/pluginSkillRegistry.ts`

Scans plugin skill directories (`skills/` for user skills, `skills_builtin/` for
builtin skills) and produces a validated, deduplicated registry snapshot.

### Entry point

```typescript
async function scanPluginSkillRegistry(
  options?: PluginSkillRegistryScanOptions,
): Promise<PluginSkillRegistrySnapshot>
```

### Validation sequence per candidate directory

1. `SKILL.md` must exist
2. `runner.json` must be valid JSON and pass `validateRunnerManifestShape()`
3. All three schema assets (input, parameter, output) must pass resolution and
   `compileSkillJsonSchema()`
4. Identity must be consistent across `SKILL.md` frontmatter and `runner.json`

### Deduplication

User skills shadow builtin skills by `skillId`. When a user skill and a builtin
skill share the same `skillId`, the builtin entry is discarded and a
`skill_shadowed` diagnostic is emitted.

### Output shape

```typescript
type PluginSkillRegistrySnapshot = {
  entries: PluginSkillRegistryEntry[];
  entriesById: Record<string, PluginSkillRegistryEntry>;
  diagnostics: PluginSkillRegistryDiagnostic[];
};
```

Each entry includes `skillId`, `description`, `sourceKind` (`"user"` |
`"builtin"`), `sourceDir`, `checksum`, and per-entry diagnostics.

---

## Skill Materialization

Two-layer architecture: a top-level orchestrator and a thin-proxy generator.

### Top-level Materializer

`src/modules/acpSkillMaterializer.ts`

```typescript
async function materializeAcpSkill(args: {
  registry: PluginSkillRegistrySnapshot;
  requestedSkillId: string;
  injectionPlan: AcpSkillInjectionPlan;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
  catalogRootDir?: string;
  executionMode?: string;
}): Promise<AcpSkillMaterializationResult>
```

Flow:
1. Build a `sharedSkillCatalog` from registry entries (excluding the requested
   skill itself).
2. If the agent family is `hermes`, skip thin proxy materialization entirely.
3. Otherwise, call `materializeAcpThinProxySkills()`.
4. Read `runner.json` from the requested skill's source directory.

The result includes `primarySkillDir`, `runnerJson`, `sharedSkillCatalogPath`,
`proxySkillRoots`, `proxySkillCount`, `outputContractDetailsMarkdown`,
`resourceRewriteWarnings`, and diagnostics.

### Thin Proxy Materializer

`src/modules/acpThinProxySkillMaterializer.ts`

```typescript
async function materializeAcpThinProxySkills(args: {
  catalog: AcpSharedSkillCatalog;
  requestedSkillId: string;
  injectionPlan: AcpSkillInjectionPlan;
  workspaceDir: string;
  resultJsonPath: string;
  inputManifestPath: string;
  executionMode?: string;
}): Promise<AcpThinProxyMaterializationResult>
```

For each catalog entry:
1. Read the original `SKILL.md`.
2. Rewrite resource references to absolute paths via
   `rewriteAcpSkillReferences()`.
3. Inject runtime enforcement, output format, execution mode, and resource
   mapping instruction blocks via `insertAcpSkillProxyPatchBlock()`.
4. Write the proxy `SKILL.md` and a `zotero-skill-proxy.json` manifest into
   the workspace.

Skills requiring `requiresFullSnapshot: true` are handled by full directory
copy instead of proxy generation.

### Reference Rewriter

`src/modules/acpSkillReferenceRewriter.ts`

```typescript
function rewriteAcpSkillReferences(args: {
  skillId: string;
  skillRoot: string;
  skillMdContent: string;
}): AcpSkillReferenceRewriteResult

function insertAcpSkillProxyPatchBlock(args: {
  rewrittenSkillMd: string;
  headerPatchBlock?: string;
  footerPatchBlock?: string;
  patchBlock?: string;
}): string
```

Rewrites `{{skill_dir}}` placeholders and bare path prefixes (`assets/`,
`scripts/`, `references/`) to absolute filesystem paths. The proxy patch block
injection is idempotent — it skips insertion if the
`zotero-skills-acp-thin-proxy` marker already exists.

---

## Schema Asset Resolution and Validation

### Schema Asset Resolver

`src/modules/acpSkillSchemaAssets.ts`

Three schema keys: `input`, `parameter`, `output`.

```typescript
async function resolveAcpSkillSchemaAsset(args: {
  skillDir: string;
  runnerJson: Record<string, unknown>;
  schemaKey: AcpSkillSchemaKey;
}): Promise<AcpSkillAssetResolution>
```

Resolution strategy:
1. Check `runnerJson.schemas.<key>` for a declared relative path.
2. If declared path exists and is valid, use it.
3. Otherwise, fall back to `assets/<key>.schema.json`.
4. If no schema file is found, return a resolution with an issue code
   (`missing_declaration`, `target_not_found`, etc.).

Request-time validation:

```typescript
async function validateAcpSkillRunRequestAgainstSchemas(args: {
  request: AcpSkillRunRequestV1;
  runnerJson: Record<string, unknown>;
  skillDir: string;
  workspaceDir: string;
}): Promise<AcpSkillRunSchemaValidationResult>
```

Schema compilation:

```typescript
function compileSkillJsonSchema(args: {
  schema: Record<string, unknown>;
  schemaKey: AcpSkillSchemaKey;
}): string[]  // empty array = valid, strings = schema errors
```

Custom annotation validation:

```typescript
function validateSkillSchemaAnnotations(args: {
  schema: Record<string, unknown>;
  schemaKey: AcpSkillSchemaKey;
}): void  // throws on invalid annotations
```

Recognized annotations:
- `x-input-source` — marks a field as sourced from selection context or
  workspace files
- `x-type` — type constraint for file-backed inputs

### Output Validator

`src/modules/acpSkillOutputValidator.ts`

```typescript
async function validateAcpSkillFinalPayload(args: {
  payload: unknown;
  runnerJson: Record<string, unknown>;
  primarySkillDir: string;
}): Promise<AcpSkillOutputValidationResult>
```

Returns `ok: true` with the validated payload, or `ok: false` with schema
errors. When validation fails, the caller can generate a repair prompt:

```typescript
function buildAcpSkillOutputRepairPrompt(args: {
  executionMode: string;
  previousCandidate?: string;
  errors: string[];
  repairRound: number;
  maxRepairRounds: number;
  outputContractDetails?: string;
}): string
```

The repair prompt includes the previous candidate text, the validation errors,
and output contract details, instructing the LLM to fix its output.

---

## Output Convergence

### Convergence Loop

`src/modules/acpSkillOutputConvergence.ts`

```typescript
async function convergeAcpSkillTurnOutput(args: {
  assistantText: string;
  executionMode?: string;
  runnerJson: Record<string, unknown>;
  primarySkillDir: string;
}): Promise<AcpSkillOutputConvergenceResult>
```

Classification of the LLM output:

| Result kind | Condition | Next step |
|-------------|-----------|-----------|
| `final` | Contains `__SKILL_DONE__: true` and payload passes schema validation | Write result envelope |
| `pending` | Interactive mode — contains `__SKILL_DONE__: false` with `message` and `ui_hints` | Show UI, wait for user reply |
| `invalid` | Parse failed or schema validation failed | Trigger result file fallback or repair loop |

JSON extraction strategies (`extractAcpSkillTurnJsonCandidate`):

1. **Direct parse** — try `JSON.parse()` on the raw text
2. **Fenced code block** — extract content from ` ```json ` blocks
3. **Balanced-brace heuristic** — find the first `{` and matching `}` in
   non-whitespace text

### Result Envelope

```typescript
async function writeAcpSkillRunnerResultEnvelope(args: {
  resultJsonPath: string;
  resultJson: Record<string, unknown>;
}): Promise<void>
```

Writes the final result JSON as a pretty-printed file to the filesystem.

---

## Result File Fallback

`src/modules/acpSkillResultFileFallback.ts`

When the convergence loop fails to produce a valid result from assistant text,
this module recovers the payload from files written by the skill's own runtime
on disk.

```typescript
async function resolveAcpSkillResultFileFallback(args: {
  skillId: string;
  runnerJson: Record<string, unknown>;
  workspaceDir: string;
  validator: (payload: unknown) => Promise<AcpSkillOutputValidationResult>;
}): Promise<AcpSkillResultFileFallbackResolution>
```

Flow:
1. Read `runnerJson.entrypoint.result_json_filename` to determine the expected
   result file name pattern.
2. Search the workspace directory for matching files.
3. Validate each candidate against the output schema using the provided
   validator function.
4. Return the best candidate's payload with warning codes.

Warning codes:

| Code | Meaning |
|------|---------|
| `OUTPUT_RECOVERED_FROM_RESULT_FILE` | Successfully recovered from a result file |
| `OUTPUT_RESULT_FILE_MULTIPLE_CANDIDATES` | Multiple candidates found; best was selected |
| `OUTPUT_RESULT_FILE_INVALID_JSON` | File contained unparseable content |
| `OUTPUT_RESULT_FILE_SCHEMA_INVALID` | File contents failed output schema validation |
| `OUTPUT_RESULT_FILE_DECLARED_NOT_FOUND` | Declared filename not found in workspace |

---

## Pipeline Integration

| Phase | Input | Output | Key Function |
|-------|-------|--------|-------------|
| Registry Scan | Skill directories | `PluginSkillRegistrySnapshot` | `scanPluginSkillRegistry()` |
| Materialization | Snapshot + skillId | `AcpSkillMaterializationResult` | `materializeAcpSkill()` |
| Schema Resolution | runnerJson + skillDir | Schema paths + validation result | `resolveAcpSkillSchemaAsset()`, `validateAcpSkillRunRequestAgainstSchemas()` |
| Output Convergence | Assistant text + runnerJson | `AcpSkillOutputConvergenceResult` | `convergeAcpSkillTurnOutput()` |
| Result File Fallback | Workspace dir + runnerJson | `AcpSkillResultFileFallbackResolution` | `resolveAcpSkillResultFileFallback()` |
| Output Validation | Candidate payload + runnerJson | `AcpSkillOutputValidationResult` | `validateAcpSkillFinalPayload()` |
