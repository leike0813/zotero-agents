## Context

See `proposal.md` for motivation. The current canonical store already owns path validation, canonical JSON encoding, section-file validation, snapshot integrity checks, filesystem materialization, CAS, journal, receipt, and recovery. Topic apply constructs the corresponding path, derived hashes, manifest fields, snapshot, promotion, and transaction identity before calling the store. Durable export/import repeats the file mapping and snapshot reconstruction in the application adapter, including a second section filename implementation with a weaker bound.

The canonical filesystem is a local-substitutable dependency. `TopicCanonicalPort` nevertheless has two justified adapters: production storage and the parity fault adapter. That seam remains useful for durable behavior variation, but pure representation computation does not vary and does not belong on the injected interface.

## Goals / Non-Goals

**Goals:**

- Give canonical representation one implementation and one test surface.
- Increase locality for path, manifest, hash, filename, asset, and transaction rules.
- Give Topic apply, durable export/import, and legacy adoption leverage from the same representation interface.
- Make invalid canonical writes structurally unrepresentable outside the canonical-store crate.
- Preserve observable bytes, hashes, paths, statuses, lifecycle ordering, and recovery evidence.

**Non-Goals:**

- Change Topic domain semantics, Structured Artifact behavior, projection policy, or the promotion commit point.
- Change the SQLite receipt witness, canonical import batch protocol, recovery ownership, or startup readiness gate.
- Change persisted canonical, bundle, WebDAV, parity corpus, or public Topic DTO formats.
- Introduce a new crate, a new durable phase port, or a general replacement for `canonical_json_hash` uses in other domains.
- Redesign unrelated repository ports.

## Decisions

### Deepen the existing canonical-store module

The existing crate becomes the representation source of truth instead of adding another crate or wrapper. Deleting a new wrapper would merely expose the same rules again; deepening the current module concentrates them without creating a hypothetical seam.

### Use asymmetric read and write contracts

Locally authored writes start as a transparent `CanonicalTopicDraft` containing Topic identity plus manifest base, artifact, metadata, sections, and markdown. The store derives all representation fields and returns an opaque `PreparedCanonicalTopic`. Only store promotion and import staging can consume that value.

Reads return a transparent `CanonicalTopicView` containing identity, domain content, and typed basis. Callers genuinely need that information for patching, detail, legacy projection, and downstream projection, so hiding it behind individual getters would enlarge the interface without adding depth. The view omits filesystem layout, journal state, and write constructors.

### Separate local preparation from durable asset decoding

Local preparation never accepts caller-supplied derived fields. Durable decoding accepts transport-neutral `{ path, text }` assets, verifies the existing representation exactly, and never silently repairs or rewrites it. Both paths produce the same opaque prepared value, letting promotion and import staging share one invariant set.

Using one catch-all constructor was rejected because callers would need to understand which fields are trusted, overwritten, or compared in each mode.

### Keep pure preparation outside TopicCanonicalPort

Pure preparation is a concrete in-process interface in the canonical-store crate. `TopicCanonicalPort` retains only the durable Topic operations whose behavior varies: typed read, prepared promotion, archive, restore, and purge. The parity fault adapter can fail promotion without reimplementing representation rules. Concrete debug and durable-bundle paths use typed `CanonicalStorePort` methods rather than expanding the Topic seam.

### Keep domain and transport ownership in the application

Topic application owns request validation, Structured Artifact output, metadata meaning, basis policy, operation phases, and when promotion occurs. Durable bundle owns envelopes, bundle manifests, conflict policy, SQLite receipt, multi-Topic coordination, and WebDAV adaptation. Canonical store owns only the Topic file representation and its durable mechanics.

Transport-neutral canonical assets avoid a dependency from canonical-store back to synthesis-application and keep WebDAV concepts out of the store.

### Store owns transaction identity

Single promotion and import staging allocate transaction IDs inside the store. Receipts may expose the ID for diagnostics and parity, but callers cannot choose it. A `parity-harness` feature provides deterministic internal injection for the Rust differential example; production constructors expose no such seam.

### Use typed errors at the canonical seam

Representation errors distinguish invalid content, bounds, and asset inconsistency. Store errors distinguish basis conflict, writer contention, repair-required state, and durable I/O failure. The application adapter maps these outcomes once to existing stable public reason codes; detailed diagnostics remain internal and are not control-flow strings.

### Replace the interface atomically

All workspace callers migrate in one change. Public-field snapshot and promotion construction is removed rather than deprecated, because a compatibility path would keep the invariant bypass alive. Private persisted structs retain the exact serde shape required by journals, import batches, and current files.

## Risks / Trade-offs

- **[Risk] Canonical manifest or asset bytes drift while moving construction.** → Add known-literal equivalence tests before implementation and keep existing parity and restart tests unchanged.
- **[Risk] Opaque prepared values complicate crash fixture construction.** → Build fixtures through the same public preparation interface, then exercise real stage and process lifecycle interfaces.
- **[Risk] Typed errors accidentally change public reason codes.** → Keep one adapter mapping and assert existing Topic/parity results rather than new text.
- **[Risk] Store-owned transaction IDs break deterministic parity.** → Forward the existing application parity feature to a canonical-store-only deterministic factory; do not change corpus or checker expectations.
- **[Risk] Representation work leaks durable-import lifecycle policy into the store.** → Keep receipt interpretation and completion sequencing in `DurableBundleApplication`; store methods accept prepared writes and retain existing staging primitives.

## Migration Plan

No data migration or deployment ordering is required. First add interface-level representation tests, implement preparation/decoding behind the current durable format, migrate Topic apply, then migrate durable bundle and parity callers. Remove the old constructors only after every caller uses the new interface. Rollback is a code rollback because persisted and wire bytes remain unchanged.
