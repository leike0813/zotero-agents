## Context

`resolveTopicPaperDigest` currently delegates representative-image enrichment to a helper that combines three responsibilities: parsing image descriptors from note HTML, resolving Zotero note and child-attachment objects, and reading local attachment bytes before projecting a data URL for the UI. That path leaves an application service coupled to Zotero globals and runtime persistence even though the public digest API is otherwise a JSON-safe DTO boundary.

The repository already uses capability-specific Host ports and canonical contract rebuilding to isolate Zotero/runtime reads. This change applies the same boundary to representative images without changing the Workbench call, digest response shape, UI rendering, persisted artifacts, or the service inventory (`128 methods / 1 direct consumer`).

## Goals / Non-Goals

**Goals:**

- Define a JSON-safe, bounded request/result contract for representative-image Host reads.
- Make descriptor parsing and UI projection pure, with Zotero/path/file behavior owned by a legacy Host adapter.
- Preserve representative-image rendering, legacy descriptor support, and best-effort digest behavior.
- Make default legacy and readonly composition choices explicit and testable.
- Prevent application-service and pure-helper regressions with source-boundary and inventory tests.

**Non-Goals:**

- Changing `SynthesisClient.workbench.readPaperDigest`, the include flag, or the digest/UI DTO.
- Migrating staged-tag writes, numeric parent bindings, Topic mirror runtime, or the final direct full-service consumer.
- Changing the Synthesis database, canonical artifacts, attachment storage, generated-image target size, or UI interactions.
- Treating a cold image cache or local path as a correctness source of truth.

## Decisions

### 1. Use one capability-specific Host read port

The application service receives an optional `hostRepresentativeImageReadPort` with a single DTO request `{ libraryId, noteKey }`. The port returns a discriminated `absent | unavailable | available` result. `absent` means the note contains no supported representative-image marker; `unavailable` means a marker exists but cannot safely yield image bytes; `available` contains the validated image payload and presentation metadata.

This is preferred over extending a broad persistence facade because the capability has distinct size, MIME, parentage, and diagnostic rules. It also avoids passing a callback into the pure helper or exposing Zotero objects and local paths to the service.

### 2. Canonically rebuild both sides of the boundary

Shared contract builders validate and reconstruct requests and results rather than trusting type assertions. They reject non-JSON values, invalid library/note/attachment identifiers, non-image MIME, malformed base64, inconsistent or excessive byte metadata, invalid dimensions, and more than 20 diagnostics. Unknown JSON-safe fields are discarded from the rebuilt DTO.

Available content is limited to 2 MiB of decoded bytes. The bound is above the existing generated-image target while keeping a future reverse transport finite. The contract exports the byte and diagnostic limits as the single source of truth used by the adapter and tests.

### 3. Separate parsing, Host resolution, and UI projection

`digestRepresentativeImage.ts` retains only deterministic HTML descriptor parsing and conversion of an already validated available Host result into the existing snake_case/data-URL digest projection. It imports neither runtime persistence nor file APIs and does not access globals.

`representativeImageReadAdapter.ts` owns note lookup, descriptor extraction, child attachment lookup, note-parent validation, image MIME and path checks, byte reading, base64 encoding, and stable diagnostic mapping. It does not return note HTML, local paths, Zotero objects, callbacks, or raw error messages. A missing marker returns `absent`; lookup/relationship/MIME/path/empty/oversize/read failures return `unavailable` with stable diagnostics.

This is preferred over keeping descriptor parsing in the service because both Host resolution and legacy-wrapper recognition need the same parser, while the parser itself is portable and independently testable.

### 4. Preserve best-effort service semantics

`resolveTopicPaperDigest` calls the port only when representative-image inclusion is requested, a digest note key exists, and a port is configured. `available` is projected into the existing UI DTO. `absent` or a missing port omits `representative_image`. Port exceptions or malformed results are converted to the existing stable representative-image-unavailable diagnostic and do not fail the digest.

The default legacy composition injects the Zotero adapter. Readonly composition deliberately omits it, documenting that the readonly harness can still resolve the digest but does not perform Host image reads.

### 5. Lock the architectural boundary with existing inventories

Core 180 provides contract and adapter behavior tests. Core 131 extends application behavior. Core 168 and 176 lock composition, forbidden imports/globals/file access, and the unchanged `128 / 1` inventory. Existing regression suites remain the source of truth for public digest/UI behavior.

## Risks / Trade-offs

- [A manually imported image exceeds 2 MiB] → Return bounded `unavailable`; never allocate or transport an unbounded result through the application boundary.
- [A backend or test double returns a type-compatible but malformed object] → Canonically rebuild at the service boundary and downgrade failure to the stable best-effort diagnostic.
- [Diagnostics accidentally expose local paths or runtime exception text] → Emit only enumerated stable codes/messages and validate result JSON safety.
- [Readonly composition no longer renders a representative image] → Make omission explicit; image enrichment remains optional and digest correctness does not depend on the port.
- [Descriptor parser behavior drifts between service and adapter] → Keep one pure parser as the shared implementation and cover current markup plus the legacy wrapper in Core 180/131.
- [The split changes public surface counts] → Add no `SynthesisService` method and retain inventory assertions at `128 methods / 1 direct consumer`.

## Migration Plan

1. Add red contract/adapter and service-boundary tests.
2. Add the shared contract and export it from the contracts index.
3. Extract pure parsing/projection and add the legacy Zotero Host adapter.
4. Inject the optional port into `SynthesisService` and default legacy composition; explicitly omit it from readonly composition.
5. Update boundary inventories and architecture/runtime documentation.
6. Run targeted regressions, type/lint/format checks, production build, and strict OpenSpec validation.

Rollback is a source-only revert of this change; no persisted data or public contract requires migration.

## Open Questions

None. The byte bound, diagnostic bound, composition behavior, and excluded migrations are fixed by this change.
