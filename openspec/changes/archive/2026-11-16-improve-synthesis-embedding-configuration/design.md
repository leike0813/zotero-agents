# Design

## Context

See [proposal.md](./proposal.md) for motivation and the two delta specs for required behavior. The Host owns connection configuration, encrypted credentials, file reads, and embedding HTTP; the sidecar receives text, vectors, and encoding identity. Existing saved connections use `baseUrl`, raw model IDs, query/document prefixes, optional dimensions, scope, and an ordered primary/fallback selection. The working provider/preferences path now covers six protocols, draft templates, request-affecting configuration, credential revisions, and optional encoding options. Combined verification passed 104 tests (UI 49, provider/preferences 43, Home 12); the two pending tests are pre-existing runtime default and context `openDashboard`. The model-filter case is covered by an existing UI test. No live provider endpoint or real interactive Preferences GUI has been exercised.

The Preferences surface is the configuration owner, while Synthesis Home remains a runtime-only read model. No Node runtime, package dependency, database migration, implicit activation, or automatic index work is available for this change.

## Goals / Non-Goals

**Goals:**

- Add one additive connection schema for six protocols, explicit endpoint/auth/parameter/discovery data, six protocol service templates, five provider presets, and two local Qwen3 templates.
- Keep old saved configuration, old default identities, and connection-independent published indexes usable.
- Make discovery, testing, and save behavior bounded, owner-scoped, credential-safe, and explicit.
- Normalize native protocol requests/responses, batch limits, retry/fallback, and error behavior behind one Host contract.

**Non-Goals:**

- Adding new providers after the six listed protocols or adding generic discovery for Voyage/Jina/Azure deployment names.
- Moving configuration into Home, adding Node execution, changing permissions, or changing the sidecar's connection-independent storage model.
- Adding a SQL migration, automatic model testing, automatic discovery, or automatic index activation.

## Decisions

### Additive Connection Schema

`SynthesisRetrievalConnection` keeps its existing required fields and adds only optional fields:

```ts
type Connection = {
  id: string;
  name: string;
  protocol: "openai" | "ollama" | "tei" | "cohere" | "voyage" | "gemini";
  baseUrl: string;
  modelId: string;
  queryPrefix: string;
  documentPrefix: string;
  dimensions?: number;
  embeddingUrl?: string;
  discovery?: {
    protocol: "openai" | "ollama" | "tei" | "cohere" | "gemini" | "none";
    url?: string;
  };
  auth?: {
    type: "none" | "bearer" | "header";
    headerName?: string;
  };
  parameters?: {
    common?: JsonObject;
    query?: JsonObject;
    document?: JsonObject;
  };
};
```

The additive shape preserves every old parse and write. `baseUrl` remains the stored compatibility field; `embeddingUrl` is the explicit endpoint override. `modelId` remains the exact user value even when an adapter adds a wire namespace such as Gemini's `models/` prefix. A missing `auth` keeps credential-present behavior compatible: bearer by default, with the Gemini API-key header as the protocol default. `auth.type: none` deliberately sends no credential header even if a credential remains stored.

The parameters are JSON objects with nested values and are nonsecret request configuration. Common values are merged first and the active purpose values overwrite the same keys. Validation rejects prototype-related keys, credential material, and any attempt to supply adapter-owned model, input, dimension, output-format, or truncation keys. This keeps one request-shape owner and prevents user parameters from changing response association, vector format, or the encrypted-credential boundary.

Alternative rejected: replace `baseUrl` with `embeddingUrl`. That would change old stored shapes and make compatible indexes depend on connection migration.

### Endpoint, Discovery, and Preset Resolution

One URL resolver serves explicit endpoints and discovery. It accepts only HTTP(S), rejects URL userinfo, fragments, and credential-looking query keys, preserves proxy path prefixes and query parameters, and disables redirects. A path already ending in the protocol endpoint is used unchanged. A known API root appends only the endpoint tail; another root appends the protocol's canonical API path and tail. Gemini resolves its model segment from the raw model ID and substitutes that segment when a base endpoint already contains a model.

The legacy `baseUrl` branch for saved OpenAI-compatible and Ollama connections keeps its prior resolution. New connections store an explicit `embeddingUrl` after validation, so their root/API-root/full-endpoint behavior is deterministic without changing old connections.

Default discovery resolution uses the embedding resolver's root:

| Protocol | Discovery |
| --- | --- |
| OpenAI-compatible | `GET /models` |
| Ollama | `GET /api/tags`; selected model may then use `POST /api/show` |
| TEI | `GET /info` |
| Cohere | `GET /v1/models` filtered for embedding use |
| Gemini | `GET /models`, follow page tokens, filter explicit embedding capability |
| Voyage / Jina | unsupported generic discovery; manual model entry |
| Azure OpenAI | deployment name is manual |

An explicit `discovery` object overrides the derived protocol and URL. `none` disables discovery. Presets are templates, not persisted connections: selecting one replaces only a new unsaved draft. The catalog contains OpenAI, Ollama, TEI, Cohere, Voyage and Gemini protocol templates; `LM Studio`, `vLLM`, `Xinference`, `Azure OpenAI` and `Jina` provider presets; and `qwen3-embedding:0.6b` plus `qwen3-embedding:4b` local templates. It contains no private-network example. A preset never starts a request, saves, establishes primary/fallback selection, enables, tests, activates or indexes a connection.

Alternative rejected: infer a preset by rewriting the currently edited connection. A draft-only template avoids changing a saved connection and keeps the user's current selection stable.

The current preset catalog uses the six protocol templates, LM Studio, vLLM, Xinference, Azure OpenAI, Jina, and the two Qwen3 local templates. They fill a new draft in the control path but do not establish primary/fallback selection, enable, test, activate or index it. Existing local placeholders remain loopback addresses; `192.168.*` private-network examples are absent from the current preset set.

### Protocol Adapter Ownership

Each protocol adapter owns its native path, request envelope, response envelope, and input capacity. Requests are split serially by the smallest applicable protocol capacity and one operation deadline covers every segment.

| Protocol | Native request | Native response | Input cap |
| --- | --- | --- | --- |
| OpenAI | `model`, `input`, float encoding, optional dimensions | `data[index].embedding` | 256 |
| Ollama | `model`, `input`, no truncation, optional dimensions | `embeddings` | 256 |
| TEI | `inputs`, no truncation, optional dimensions | array of arrays | 256 |
| Cohere | `model`, `texts`, float output, no truncation, optional output dimension | `embeddings.float` | 96 |
| Voyage | `model`, `input`, float output, no truncation, optional output dimension | `data[index].embedding` | 128 |
| Gemini | per-input `content`, task type, optional output dimensionality | `embeddings[].values` | 100 |

Purpose defaults such as Cohere query/document type, Voyage input type, and Gemini task type are applied by the adapter before user common/purpose parameters. This preserves adapter-owned input semantics while allowing provider-specific optional fields.

Ollama requests target `/api/embed`. The provider does not automatically fall back to the legacy `/api/embeddings` route after a failure; another connection can serve only through the normal explicit ordered fallback path.

Each protocol-sized document segment may make at most three total attempts, including one same-service retry and fallback. A query tries each selected compatible service once. Authentication, model, and configuration responses consume the service's one attempt without same-service retry. All response vectors remain in memory until every segment validates; one failed segment fails the logical batch and returns no successful prefix. `Retry-After` delays consume the shared deadline.

Alternative rejected: one universal batch size. Cohere and Gemini have lower native limits, and a shared size would either reject valid documents or send avoidable requests.

### Atomic Response Validation

Adapters map native response rows to request associations first. OpenAI and Voyage use explicit `index`; ordered protocols require exactly the requested row count and order. Missing, duplicate, extra, non-integer, or out-of-range associations fail the response. Every mapped vector is then checked for expected dimensions, finite float32 round-trip, and nonzero norm. No adapter-specific path bypasses that final validation.

Query input is never split for text length, truncated, or transformed by the adapter beyond its configured query prefix. Document splitting retains original source ranges, so response association failure cannot create a partial publication.

### Encoding Options Identity

`SynthesisEncodingIdentity.encodingOptionsKey` is optional. Its value is a canonical JSON hash of the effective `{ query, document }` objects after protocol defaults, common parameters, and purpose overrides. The operation reuses the existing canonical JSON hashing helper. Prefixes, dimensions, and model remain explicit identity fields. Endpoint, discovery, auth, connection identity, credential, and other non-option metadata are excluded.

When the effective options pair is empty, the key is omitted and the legacy four-field identity is written exactly as before. Cohere, Voyage, Gemini, and Jina presets with effective purpose defaults have a key because those options change the encoding request. The Rust contract accepts an omitted key and omits it from serialized output; the same key is required when it is present. No SQL migration is needed because the key travels with encoding/maintenance DTOs rather than a new relational column.

Alternative rejected: include the whole connection in the index identity. That would invalidate compatible indexes when only an endpoint, credential, name, or fallback changes.

The connection-test key is separate from `encodingOptionsKey`. It is a canonical JSON hash of the request-affecting saved connection configuration plus the encrypted credential revision. It excludes display identity (`id`, `name`) and discovery settings, while endpoint URL, authentication, protocol, model, prefixes, dimensions, and effective parameters affect it. This makes a changed endpoint or credential invalidate the tested configuration even though those values remain outside the index identity.

### Draft, Discovery, and Test Ownership

Preferences keeps one in-memory draft with a monotonically changed owner/revision, separate from saved connections. Create/edit/delete and primary/fallback ordering operate on drafts and persist only through an explicit save. Deleting a connection clears its encrypted credential, unsets primary when that connection owned it, removes it from fallbacks, and retains the relative order of the remaining fallbacks. Unknown, deleted or duplicate explicit selections remain invalid and are rejected. Save does not toggle activation, run discovery, run a probe, or start index work. Scope controls keep their current pending scope and are not reset by a connection edit.

Discovery consumes the draft object and any credential currently typed or available for it without saving either. It uses one 15-second deadline, at most 20 pages and 1,000 unique entries, and reports completed rows as `partial` when a later page fails, timeout/cancellation occurs, a page token repeats, or the entry cap is reached. A response is applied only when the draft/selection owner still matches its request token. Raw response bodies and credentials never enter diagnostics.

OpenAI, Ollama, TEI, Cohere and Gemini surface only catalog-returned identifiers and do not guess omitted models. Voyage, Jina and Azure deployment names remain manual. Ollama `show` metadata may classify a model but does not populate the requested output dimension; only an explicit synthetic probe reports the actual dimension.

Save-and-test follows one explicit operation:

1. Validate the complete draft and capture the previous persisted configuration and credential revision.
2. Encrypt and persist both values as one logical save; restore both on failure before probing.
3. Run fixed synthetic query and document probes under one 15-second deadline against the saved connection.
4. Store success only with the request-configuration key and credential revision tested; keep that test key distinct from `encodingOptionsKey`.
5. Invalidate test success when either input changes, and ignore late completion for another owner/revision.

The probe reports dimensions and latency but never a credential or raw response. A failed probe leaves the draft in place, marks the saved version untested, and cannot create/update an index. Fallback resolution filters services by the full effective identity, including options key, before ordering them. A regression test covers restoring both the preference configuration and encrypted credential when either write fails. An older probe for the same request configuration cannot overwrite a newer successful result.

Alternative rejected: test before persistence. That would let a successful synthetic result refer to credentials or configuration that were never saved, and a later save could silently change the tested version.

### Host and Sidecar Boundary

The Host remains the sole owner of URL resolution, discovery, credentials, HTTP, and preference state. Sidecar DTOs expose only bounded text, vectors, and the free connection identity. Home receives runtime availability/progress through its existing bounded projection and does not render drafts, URLs, models, credentials, discovery, or tests.

## Risks / Trade-offs

- Endpoint root heuristics can misclassify unusual proxy paths -> Use an explicit full endpoint, preserve legacy `baseUrl` behavior, and test root/API-root/full/proxy/query forms.
- Provider catalogs and pagination differ or drift -> Keep discovery protocol adapters, manual model entry, partial results, and fixture tests independent of normal encoding success.
- Raw provider diagnostics may expose a secret -> Convert failures to fixed codes before UI state and never store response text or request headers.
- Two preference writes can leave mismatched state -> Validate before writes, restore both the configuration and encrypted credential on write failure, and bind tests to both configuration and credential revision.
- Late discovery/test responses can overwrite another draft -> Carry owner/revision tokens through every Host call and drop stale results.
- One failed batch segment could publish partial coverage -> Stage all segment vectors and return/publish only after every segment validates.
- Old sidecar builds may reject `encodingOptionsKey` -> Keep the Rust field optional, omit it for legacy identities, require the compatible sidecar contract, and treat native acceptance as unchecked until its focused evidence is recorded.

## Migration Plan

1. Keep the additive contract and current automated coverage while the remaining parent-owned tasks close real GUI, live-endpoint, cross-language, packaging and real-Zotero acceptance.
2. Verify Preferences draft CRUD, explicit primary/ordered fallback, full-field exposure, scope preservation, save-and-test, and stale-owner handling in the real GUI.
3. Validate unchanged old vectors and rebuilt compatible vectors through the bundled sidecar contract.
4. Both delta capabilities have been synced into their existing main specs; keep reviewing those contracts while the change remains active and run `openspec validate --specs` after documentation changes.
5. Do not archive until a later explicit request after separate acceptance.

Rollback requires the prior Host/sidecar identity pairing. Configurations that never use the new optional fields remain readable by the prior parser; an index built with effective encoding options must retain a sidecar version that understands `encodingOptionsKey` or be rebuilt from the prior identity. There is no SQL down migration.

Current verification passed 104 combined tests (UI 49, provider/preferences 43, Home 12); the two pending tests are pre-existing runtime default and context `openDashboard`. All 11 locales and localization governance pass, and Node shards passed 272/272 and 181/181. Rust evidence covers 31 retrieval and four identity tests and one native embedding test. A native production run passed 43 tests in eight minutes covering 121 retrieval and 92 embedding cases. The standalone full checker returned `ok: false` with no errors but missing current execution evidence and broad coverage because its identity includes actively changed tests, so the full aggregate remains incomplete. Root and Synthesis TypeScript checks and contracts including canonical validators pass. Targeted cross-language behavior is validated; full cross-language evidence is not green. Live endpoints, real GUI, current seven-platform artifacts, XPI and real Zotero remain unverified.
