# Ollama embedding model version binding

Scope: Ollama only.

Read-only check against current official documentation and `ollama/ollama` source, 2026-10-04.
No Ollama service or model was run.
This records evidence and limits; it makes no product decision.

## Findings

### 1. `/api/embed` digest addressing

**Verified:** The documented request takes `model` as a model name.

The response contains the requested model name and vectors, with no digest/revision field.
The OpenAPI schema also describes `EmbedRequest.model` as a model name.
[Embed API](https://docs.ollama.com/api/embed) · [OpenAPI schema](https://github.com/ollama/ollama/blob/main/docs/openapi.yaml)

**Verified in current source:** `EmbedHandler` parses the supplied reference, resolves `modelRef.Name` through `getExistingName`, and loads that named model.

It then responds with `Model: req.Model`.
It does not select a local manifest by digest in this handler.
[server/routes.go](https://github.com/ollama/ollama/blob/main/server/routes.go)

**Digest syntax status:** The current `types/model/name.go` parser implementation splits tag and path components but does not extract an `@digest`.

Its `Name` value has no digest field.
A nearby comment lists `@{digest}` among intended name forms, but the implementation does not implement that form.
The comment alone is not evidence that `/api/embed` accepts an immutable digest selector.
`sha256:...` is not documented as an embedding selector; the parser treats `:` as the model-tag separator.
A bare blob digest is likewise not an API-documented model name.
[types/model/name.go](https://github.com/ollama/ollama/blob/main/types/model/name.go)

**Unknown:** No live request was made.

The reviewed official sources do not document a supported `/api/embed` syntax that pins a local model by manifest digest.
Treat `@sha256:…`, `sha256:…`, and bare digest as **unsupported/unverified for this use**.
Do not infer support from the parser comment or blob endpoints.

### 2. Meaning and coverage of `/api/tags` digest

**Verified:** `/api/tags` reports the digest for each locally available named model.

In Ollama source, a manifest consists of a `config` layer and an ordered `layers` list.
`Manifest.Digest()` is computed by SHA-256 over the serialized named manifest file.
The digest therefore identifies the **manifest document**, not just one weights blob.
[List models API](https://docs.ollama.com/api/tags) · [manifest/manifest.go](https://github.com/ollama/ollama/blob/main/manifest/manifest.go)

**Coverage:** The manifest digest commits to the config/layer digest references and their metadata.

The model config is stored in the config layer.
Ollama model creation/configuration has fields for template, system prompt, parameters, messages, renderer, and parser.
So the manifest identity covers the config-layer reference as well as the weight-layer references.
This does not mean the digest hashes expanded weights plus every runtime dependency.
[manifest/manifest.go](https://github.com/ollama/ollama/blob/main/manifest/manifest.go) · [OpenAPI schema](https://github.com/ollama/ollama/blob/main/docs/openapi.yaml)

### 3. Copy aliases and immutability

**Verified:** `/api/copy` takes source and destination model names.

The server resolves both as names, then copies the source model to the destination name.
The API describes a naming operation; it provides no immutable-alias or lock guarantee.
[Copy API](https://docs.ollama.com/api/copy) · [server/routes.go](https://github.com/ollama/ollama/blob/main/server/routes.go)

**Conclusion / limit:** A copied alias is still a mutable name-level reference.

The reviewed contract does not promise that it cannot later be rebound through copy/create or other model-management operations.
Copying under a version-looking name is therefore not verified as a freeze mechanism.
A fixed version can only be relied on under a controlled deployment that also controls model-store contents and prevents name rebinding or replacement.
That is a deployment assumption, not an Ollama API immutability feature.

### 4. Read-then-embed race and response evidence

**Verified:** `/api/tags` gives inventory digest evidence.

`/api/embed` accepts a name and returns that name, not the digest or a model revision.
The documented API exposes no request field for expected digest and no response revision evidence.
[List models API](https://docs.ollama.com/api/tags) · [Embed API](https://docs.ollama.com/api/embed) · [server/routes.go](https://github.com/ollama/ollama/blob/main/server/routes.go)

**Unknown:** The checked official sources do not establish an atomic contract binding a prior `/api/tags` digest read to the exact model artifact used by a subsequent `/api/embed`.

They also do not establish that Ollama provides no internal synchronization.
The bounded review finds no exposed expected-digest precondition or response digest/revision proof.
A preflight digest read followed by a name-based embedding request therefore cannot be described from this evidence as an absolute version guarantee.

## Source set

Seven official entry points were consulted:

- Ollama API docs for [embed](https://docs.ollama.com/api/embed), [tags](https://docs.ollama.com/api/tags), and [copy](https://docs.ollama.com/api/copy).
- Official `ollama/ollama` source for [model-name parsing](https://github.com/ollama/ollama/blob/main/types/model/name.go), [API routes](https://github.com/ollama/ollama/blob/main/server/routes.go), [manifest handling](https://github.com/ollama/ollama/blob/main/manifest/manifest.go), and the [OpenAPI schema](https://github.com/ollama/ollama/blob/main/docs/openapi.yaml).
