use serde::Deserialize;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use synthesis_repository::{TagStagedSuggestionRecord, TagVocabularyReplacement};

use crate::runtime_artifact_library_debug;
use crate::runtime_production_ports::ProductionApplications;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RelatedItemsEchoRequest {
    library_id: i64,
    item_key: String,
    #[serde(default)]
    related_item_key: Option<String>,
}

fn one<T: DeserializeOwned>(args: &[Value]) -> Result<T, String> {
    match args {
        [value] => serde_json::from_value(value.clone()).map_err(|_| "invalid_request".into()),
        _ => Err("invalid_request".into()),
    }
}

fn object_arg(args: &[Value]) -> Result<Value, String> {
    let value = one::<Value>(args)?;
    if value.is_object() {
        Ok(value)
    } else {
        Err("invalid_request".into())
    }
}

fn optional_string_field<'a>(value: &'a Value, names: &[&str]) -> Option<&'a str> {
    names
        .iter()
        .find_map(|name| value.get(*name).and_then(Value::as_str))
        .filter(|value| !value.is_empty())
}

fn digest_resolution_from_compat(
    apps: &ProductionApplications,
    args: &[Value],
) -> Result<Value, String> {
    let request = object_arg(args)?;
    let paper_ref = optional_string_field(&request, &["paper_ref", "paperRef"]).unwrap_or_default();
    let Some(locator) = request.get("locator") else {
        return Ok(json!({
            "ok":false,
            "status":"unavailable",
            "paper_ref":paper_ref,
            "digest_markdown":"",
            "recorded_hash":"",
            "current_hash":"",
            "source_changed":false,
            "diagnostics":["digest_unavailable"],
        }));
    };
    let expected_hash = request
        .get("expectedHash")
        .or_else(|| request.get("expected_hash"))
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "invalid_request".to_owned())?;
    let result = apps.call_host(
        "library.artifacts.read",
        json!({"locator":locator,"expectedHash":expected_hash}),
    )?;
    let markdown = result
        .get("text")
        .or_else(|| result.get("markdown"))
        .and_then(Value::as_str)
        .unwrap_or_default();
    Ok(json!({
        "ok":!markdown.is_empty(),
        "status":if markdown.is_empty() { "unavailable" } else { "available" },
        "paper_ref":paper_ref,
        "digest_markdown":markdown,
        "recorded_hash":"",
        "current_hash":expected_hash,
        "source_changed":false,
        "diagnostics":result.get("diagnostics").cloned().unwrap_or_else(|| json!([])),
    }))
}

#[allow(dead_code)]
fn tag_candidate_request(
    args: &[Value],
) -> Result<(Option<String>, TagVocabularyReplacement), String> {
    match args {
        [candidate] => {
            let expected = optional_string_field(
                candidate,
                &["expectedVocabularyHash", "expected_vocabulary_hash"],
            )
            .map(str::to_owned);
            let candidate = candidate
                .get("candidate")
                .or_else(|| candidate.get("replacement"))
                .cloned()
                .unwrap_or_else(|| candidate.clone());
            serde_json::from_value(candidate)
                .map(|candidate| (expected, candidate))
                .map_err(|_| "invalid_request".into())
        }
        [expected, candidate] => {
            let expected = expected.as_str().map(str::to_owned);
            serde_json::from_value(candidate.clone())
                .map(|candidate| (expected, candidate))
                .map_err(|_| "invalid_request".into())
        }
        _ => Err("invalid_request".into()),
    }
}

#[allow(dead_code)]
fn staged_request(args: &[Value]) -> Result<(i64, Vec<TagStagedSuggestionRecord>), String> {
    match args {
        [request] => {
            let revision = request
                .get("expectedRevision")
                .or_else(|| request.get("expected_revision"))
                .and_then(Value::as_i64)
                .ok_or_else(|| "invalid_request".to_owned())?;
            let staged = request
                .get("staged")
                .or_else(|| request.get("suggestions"))
                .or_else(|| request.get("retained"))
                .cloned()
                .ok_or_else(|| "invalid_request".to_owned())?;
            serde_json::from_value(staged)
                .map(|staged| (revision, staged))
                .map_err(|_| "invalid_request".into())
        }
        [revision, staged] => {
            let revision = revision
                .as_i64()
                .ok_or_else(|| "invalid_request".to_owned())?;
            serde_json::from_value(staged.clone())
                .map(|staged| (revision, staged))
                .map_err(|_| "invalid_request".into())
        }
        _ => Err("invalid_request".into()),
    }
}

#[allow(dead_code)]
fn tag_vocabulary_hash(apps: &ProductionApplications) -> Result<String, String> {
    apps.tags
        .inspect()?
        .vocabulary_hash
        .ok_or_else(|| "tag_vocabulary_not_initialized".to_owned())
}

type ProductionClientHandler = fn(&ProductionApplications, &[Value]) -> Result<Value, String>;

struct RegisteredProductionClientHandler {
    capability: &'static str,
    dispatch: ProductionClientHandler,
}

macro_rules! register_production_client_handlers {
    ($(($capability:literal, $handler:expr)),+ $(,)?) => {
        const PRODUCTION_CLIENT_HANDLERS: &[RegisteredProductionClientHandler] = &[
            $(RegisteredProductionClientHandler {
                capability: $capability,
                dispatch: $handler,
            }),+
        ];
    };
}

register_production_client_handlers!(
    ("client.getSchemas", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.getSchemas", args)
    }),
    ("client.isBuiltinTagPolicyInitialized", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.isBuiltinTagPolicyInitialized", args)
    }),
    ("client.loadTagVocabulary", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.loadTagVocabulary", args)
    }),
    ("client.exportTagVocabularyForRegulator", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.exportTagVocabularyForRegulator", args)
    }),
    ("client.listStagedTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.listStagedTagSuggestions", args)
    }),
    ("client.clearTagAuditRecord", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.clearTagAuditRecord", args)
    }),
    ("client.debugSynthesisSnapshot", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisSnapshot", args)
    }),
    ("client.debugSynthesisCacheList", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisCacheList", args)
    }),
    ("client.debugSynthesisOperationsList", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisOperationsList", args)
    }),
    ("client.debugSynthesisTopicInspect", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisTopicInspect", args)
    }),
    ("client.consumeRelatedItemsSyncEcho", |apps, args| {
        let request = one::<RelatedItemsEchoRequest>(args)?;
        apps.consume_related_items_sync_echo(
            request.library_id,
            &request.item_key,
            request.related_item_key.as_deref(),
        )
    }),
    ("client.readPaperArtifacts", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.readPaperArtifacts", args)
    }),
    ("client.getPaperArtifactManifest", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.getPaperArtifactManifest", args)
    }),
    ("client.exportFilteredPaperArtifacts", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.exportFilteredPaperArtifacts", args)
    }),
    (
        "client.resolveTopicPaperDigest",
        digest_resolution_from_compat
    ),
    ("client.queryConceptKb", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(apps, "client.queryConceptKb", args)
    }),
    ("client.rebuildConceptKbIndex", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.rebuildConceptKbIndex",
            args,
        )
    }),
    ("client.updateConceptDisplayText", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.updateConceptDisplayText",
            args,
        )
    }),
    ("client.applyConceptReviewAction", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.applyConceptReviewAction",
            args,
        )
    }),
    ("client.deleteConceptEntries", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.deleteConceptEntries",
            args,
        )
    }),
    ("client.rebuildTopicGraphIndex", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.rebuildTopicGraphIndex",
            args,
        )
    }),
    ("client.acceptTopicGraphRelation", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.acceptTopicGraphRelation",
            args,
        )
    }),
    ("client.rejectTopicGraphRelation", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.rejectTopicGraphRelation",
            args,
        )
    }),
    ("client.applyTopicGraphReviewAction", |apps, args| {
        crate::runtime_concept_topic_graph_surface::dispatch(
            apps,
            "client.applyTopicGraphReviewAction",
            args,
        )
    }),
    ("client.saveTagVocabulary", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.saveTagVocabulary", args)
    }),
    ("client.validateTagVocabulary", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.validateTagVocabulary", args)
    }),
    ("client.rebuildTagVocabularyIndex", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.rebuildTagVocabularyIndex", args)
    }),
    ("client.stageTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.stageTagSuggestions", args)
    }),
    ("client.updateStagedTagSuggestion", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.updateStagedTagSuggestion", args)
    }),
    ("client.updateTagVocabularyEntry", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.updateTagVocabularyEntry", args)
    }),
    ("client.deleteTagVocabularyEntry", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.deleteTagVocabularyEntry", args)
    }),
    ("client.promoteStagedTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.promoteStagedTagSuggestions", args)
    }),
    ("client.discardStagedTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.discardStagedTagSuggestions", args)
    }),
    ("client.clearStagedTagSuggestions", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.clearStagedTagSuggestions", args)
    }),
    ("client.previewTagVocabularyImport", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.previewTagVocabularyImport", args)
    }),
    ("client.applyTagVocabularyImport", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.applyTagVocabularyImport", args)
    }),
    ("client.replaceTagAuditRecords", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.replaceTagAuditRecords", args)
    }),
    ("client.initializeBuiltinTagPolicy", |apps, args| {
        crate::runtime_tag_surface::dispatch(apps, "client.initializeBuiltinTagPolicy", args)
    }),
    ("client.getPublicMaintenanceOperation", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(
            apps,
            "client.getPublicMaintenanceOperation",
            args,
        )
    }),
    ("client.getLibraryIndex", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.getLibraryIndex", args)
    }),
    ("client.debugSynthesisProfilerList", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisProfilerList", args)
    }),
    ("client.debugSynthesisPaperInspect", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisPaperInspect", args)
    }),
    ("client.debugSynthesisDiff", |apps, args| {
        runtime_artifact_library_debug::dispatch(apps, "client.debugSynthesisDiff", args)
    }),
    ("client.debugSynthesisCleanInstallReset", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(
            apps,
            "client.debugSynthesisCleanInstallReset",
            args,
        )
    }),
    (
        "client.reconcileSynthesisRuntimeWorkStateOnStartup",
        |apps, args| {
            crate::runtime_webdav_maintenance_surface::dispatch(
                apps,
                "client.reconcileSynthesisRuntimeWorkStateOnStartup",
                args,
            )
        }
    ),
    ("client.resetSynthesisDatabase", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(
            apps,
            "client.resetSynthesisDatabase",
            args,
        )
    }),
    ("client.syncWebDavNow", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(apps, "client.syncWebDavNow", args)
    }),
    ("client.pauseWebDavSync", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(apps, "client.pauseWebDavSync", args)
    }),
    ("client.resumeWebDavSync", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(apps, "client.resumeWebDavSync", args)
    }),
    ("client.retryWebDavSync", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(apps, "client.retryWebDavSync", args)
    }),
    ("client.resolveWebDavSyncConflict", |apps, args| {
        crate::runtime_webdav_maintenance_surface::dispatch(
            apps,
            "client.resolveWebDavSyncConflict",
            args,
        )
    }),
);

#[cfg(test)]
fn dispatched_production_client_capabilities() -> impl Iterator<Item = &'static str> {
    PRODUCTION_CLIENT_HANDLERS
        .iter()
        .map(|handler| handler.capability)
        .chain(crate::runtime_topic_workbench_surface::dispatched_capabilities())
        .chain(crate::runtime_reference_citation_surface::dispatched_capabilities())
}

// The control receipt endpoint is deliberately handled by the production
// transport before legacy dispatch.  Keep it visible to the roster tests so a
// wire-only extension cannot be mistaken for an unimplemented capability.
#[cfg(test)]
const DIRECT_PRODUCTION_CLIENT_CAPABILITIES: &[&str] =
    &["client.controlPublicMaintenanceOperation"];

pub(crate) fn dispatch_legacy_client(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Result<Value, String> {
    if let Some(result) = crate::runtime_topic_workbench_surface::dispatch(apps, capability, args) {
        return result;
    }
    if let Some(result) =
        crate::runtime_reference_citation_surface::dispatch(apps, capability, args)
    {
        return result;
    }
    PRODUCTION_CLIENT_HANDLERS
        .iter()
        .find(|handler| handler.capability == capability)
        .ok_or_else(|| "operation_unavailable".to_owned())
        .and_then(|handler| (handler.dispatch)(apps, args))
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;
    use std::path::{Path, PathBuf};
    use std::sync::{Arc, Mutex};
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;
    use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
    use synthesis_repository::{CacheBasisRecord, Repository, RepositoryIdentity};
    use synthesis_sidecar::production_capabilities::{
        READY_PRODUCTION_CLIENT_CAPABILITIES, production_client_capabilities,
    };

    use crate::runtime_production_ports::build_production_applications;
    use crate::runtime_worker_pool::NativeComputePool;

    fn test_root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-production-compat-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap_or_default()
                .as_nanos()
        ))
    }

    fn test_applications(root: &Path) -> ProductionApplications {
        let repository = Repository::open(
            root,
            RepositoryIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("repository");
        let canonical = CanonicalStore::open(
            root,
            CanonicalIdentity {
                profile_id: "profile".into(),
                data_root_id: "data".into(),
            },
        )
        .expect("canonical");
        build_production_applications(
            Arc::new(Mutex::new(repository)),
            Arc::new(Mutex::new(canonical)),
            Arc::new(NativeComputePool::new()),
            None,
            "service".into(),
            root.join("webdav-state.json"),
        )
    }

    fn literature_digest_request() -> Value {
        json!({
            "libraryId":1,
            "itemKey":"AAAA1111",
            "paperRef":"1:AAAA1111",
            "itemType":"journalArticle",
            "title":"Source paper",
            "year":"2026",
            "date":"2026-01-01",
            "creators":["Source Author"],
            "tags":["topic:test"],
            "collections":["collection-1"],
            "doi":"10.1000/source",
            "arxiv":"",
            "isbn":"",
            "url":"https://example.test/source",
            "citekey":"source2026",
            "dateAdded":"2026-01-01",
            "digest":{
                "noteKey":"DIGEST1",
                "payloadHash":"sha256:digest-1",
                "content":"# Digest\n".to_owned() + &"x".repeat(128 * 1024),
            },
            "references":{
                "noteKey":"REFS1",
                "payloadHash":"sha256:references-1",
                "references":[{
                    "title":"Matched paper",
                    "year":"2024",
                    "authors":["Matched Author"],
                    "citekey":"matched2024",
                    "raw":"Matched Author (2024). Matched paper."
                }]
            },
            "citationAnalysis":{
                "noteKey":"CITATION1",
                "payloadHash":"sha256:citation-1",
                "citations":[{"reference_index":0,"role":"background"}]
            },
            "literatureMatchingMetadata":{
                "key_terms":["  Knowledge Graph  ","knowledge graph","Rust"],
                "methods":["Case Study"],
                "problems":["Reference Drift"],
                "datasets":["Zotero Library"],
                "exclude_terms":["Legacy"]
            },
            "matchedReferences":[{
                "libraryId":1,
                "itemKey":"BBBB2222",
                "paperRef":"1:BBBB2222",
                "title":"Matched paper",
                "year":"2024",
                "citekey":"matched2024"
            }]
        })
    }

    fn apply_literature_digest(
        apps: &ProductionApplications,
        request: Value,
    ) -> Result<Value, String> {
        let request = serde_json::from_value::<
            crate::runtime_reference_canonical::LiteratureDigestApplyRequest,
        >(request)
        .map_err(|_| "invalid_request".to_owned())?;
        apps.reference_canonical.apply_literature_digest(request)
    }

    #[test]
    fn registered_handlers_are_unique_and_declared() {
        let declared = production_client_capabilities()
            .unwrap()
            .into_iter()
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .chain(DIRECT_PRODUCTION_CLIENT_CAPABILITIES.iter().copied())
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert_eq!(
            registered.len(),
            PRODUCTION_CLIENT_HANDLERS.len()
                + 16
                + 28
                + DIRECT_PRODUCTION_CLIENT_CAPABILITIES.len()
        );
        assert!(registered.is_subset(&declared));
    }

    #[test]
    fn every_declared_client_operation_has_exactly_one_handler() {
        let declared = production_client_capabilities()
            .unwrap()
            .into_iter()
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .chain(DIRECT_PRODUCTION_CLIENT_CAPABILITIES.iter().copied())
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert_eq!(registered, declared);
    }

    #[test]
    fn ready_roster_is_a_dispatchable_subset() {
        let ready = READY_PRODUCTION_CLIENT_CAPABILITIES
            .iter()
            .map(|capability| (*capability).to_owned())
            .collect::<BTreeSet<_>>();
        let registered = dispatched_production_client_capabilities()
            .chain(DIRECT_PRODUCTION_CLIENT_CAPABILITIES.iter().copied())
            .map(str::to_owned)
            .collect::<BTreeSet<_>>();
        assert!(ready.is_subset(&registered));
    }

    #[test]
    fn topic_apply_rejects_a_raw_bundle_without_the_strict_envelope() {
        let root = test_root();
        let apps = test_applications(&root);
        let result = dispatch_legacy_client(
            &apps,
            "client.applyTopicSynthesisResult",
            &[json!({"topicId":"topic:test","title":"Raw bundle"})],
        );

        assert_eq!(result, Err("invalid_request".into()));
    }

    #[test]
    fn missing_topic_lifecycle_routes_return_typed_terminals_without_touching_topic_graph() {
        let root = test_root();
        let apps = test_applications(&root);

        assert_eq!(
            dispatch_legacy_client(
                &apps,
                "client.deleteTopicArtifact",
                &[json!({"topicId":"topic:test"})],
            ),
            Ok(json!({
                "ok":false,
                "status":"not_found",
                "topicId":"topic:test",
                "reason":"topic artifact not found"
            }))
        );
        assert_eq!(
            dispatch_legacy_client(&apps, "client.purgeDeletedTopicArtifacts", &[]),
            Ok(json!({"ok":true,"status":"purged","purged_count":0}))
        );
        assert!(
            apps.topic_graph
                .load()
                .expect("topic graph")
                .nodes
                .is_empty()
        );
    }

    #[test]
    fn workbench_surfaces_use_domain_projections_instead_of_maintenance_chrome() {
        let root = test_root();
        let apps = test_applications(&root);
        for (surface, field) in [
            ("home", "artifacts"),
            ("topics", "artifacts"),
            ("review", "reviews"),
            ("tags", "tags"),
            ("concepts", "concepts"),
            ("reader", "reader"),
        ] {
            let projection = dispatch_legacy_client(
                &apps,
                "client.getSynthesisWorkbenchSurfaceInput",
                &[json!(surface), json!({})],
            )
            .unwrap_or_else(|error| panic!("{surface}: {error}"));
            assert!(projection.get(field).is_some(), "{surface}: {projection}");
            assert!(
                projection.get("maintenance").is_none(),
                "{surface}: {projection}"
            );
        }
    }

    #[test]
    fn related_items_echo_reads_repository_without_calling_reverse_host() {
        let root = test_root();
        let apps = test_applications(&root);
        assert_eq!(
            dispatch_legacy_client(
                &apps,
                "client.consumeRelatedItemsSyncEcho",
                &[json!({"libraryId":1,"itemKey":"AAAA1111"})],
            ),
            Ok(json!({"consumed":false}))
        );
        let payload = json!({
            "effectId":"effect:1",
            "sourceLibraryId":1,
            "sourceItemKey":"AAAA1111",
            "targetLibraryId":1,
            "targetItemKey":"BBBB2222",
            "status":"applied",
            "externalWriteAt":synthesis_protocol::utc_now_iso8601(),
            "echoState":"awaiting_echo",
            "updatedAt":synthesis_protocol::utc_now_iso8601()
        });
        apps.repository
            .owner()
            .lock()
            .expect("repository")
            .execute(
                "INSERT INTO synt_related_items_sync_effect(effect_id,payload_json,updated_at) VALUES(?1,?2,?3)",
                &[
                    json!("effect:1"),
                    json!(serde_json::to_string(&payload).expect("payload")),
                    json!(synthesis_protocol::utc_now_iso8601()),
                ],
            )
            .expect("seed echo");

        assert_eq!(
            dispatch_legacy_client(
                &apps,
                "client.consumeRelatedItemsSyncEcho",
                &[json!({
                    "libraryId":1,
                    "itemKey":"AAAA1111",
                    "relatedItemKey":"BBBB2222"
                })],
            ),
            Ok(json!({"consumed":true}))
        );
    }

    #[test]
    fn unavailable_debug_projections_return_typed_stable_terminals() {
        let root = test_root();
        let apps = test_applications(&root);
        for (operation, request) in [
            ("client.debugSynthesisProfilerList", json!({})),
            (
                "client.debugSynthesisPaperInspect",
                json!({"paperRef":"1:ABSENT"}),
            ),
            ("client.debugSynthesisDiff", json!({})),
        ] {
            assert_eq!(
                dispatch_legacy_client(&apps, operation, &[request]),
                Ok(json!({"status":"unavailable","diagnostics":[]})),
                "{operation}"
            );
        }
    }

    #[test]
    fn literature_digest_receipt_is_idempotent_after_reopen() {
        let root = test_root();
        let request = literature_digest_request();
        let first_apps = test_applications(&root);
        let first = apply_literature_digest(&first_apps, request.clone()).expect("first apply");
        assert_eq!(first["status"], "sidecar_applied");
        assert_eq!(first["idempotent"], false);

        let second_apps = test_applications(&root);
        let second = apply_literature_digest(&second_apps, request).expect("reopened apply");
        assert_eq!(second["status"], "sidecar_applied");
        assert_eq!(second["idempotent"], true);
        assert_eq!(first["operationId"], second["operationId"]);
    }

    #[test]
    fn literature_digest_apply_materializes_and_rolls_back_scoped_state() {
        let root = test_root();
        let apps = test_applications(&root);
        let request = literature_digest_request();
        let first = apply_literature_digest(&apps, request.clone()).expect("materialized apply");
        assert_eq!(first["status"], "sidecar_applied");
        assert_eq!(first["sourceRef"], "1:AAAA1111");
        assert_eq!(first["source_ref"], "1:AAAA1111");
        assert_eq!(first["paperRef"], "1:AAAA1111");
        assert_eq!(first["reference_count"], 1);
        assert_eq!(first["matched_count"], 1);

        let owner = apps.repository.owner();
        let repository = owner.lock().expect("repository");
        let artifacts = repository
            .list_reference_artifacts(&["1:AAAA1111".into()])
            .expect("artifacts");
        assert_eq!(artifacts.len(), 3);
        let raw_before = repository.list_raw_references().expect("references");
        assert_eq!(raw_before.len(), 1);
        assert!(raw_before[0].roles_json.contains("background"));
        let bindings = repository.list_reference_bindings().expect("bindings");
        assert_eq!(bindings.len(), 1);
        assert_eq!(bindings[0].item_key, "BBBB2222");
        let metadata = repository
            .query(
                "SELECT * FROM synt_literature_matching_metadata WHERE literature_item_id=?1",
                &[json!("1:AAAA1111")],
            )
            .expect("metadata");
        assert_eq!(metadata.len(), 1);
        assert_eq!(
            metadata[0]["key_terms_json"],
            "[\"Knowledge Graph\",\"Rust\"]"
        );

        for key in ["citation-graph:library", "related-items-sync:global"] {
            repository
                .upsert_cache_basis(&CacheBasisRecord {
                    cache_key: key.into(),
                    cache_kind: key.into(),
                    status: "ready".into(),
                    updated_at: "ready".into(),
                    ..CacheBasisRecord::default()
                })
                .expect("ready cache");
        }
        drop(repository);

        let mut digest_only = request.clone();
        digest_only["digest"]["payloadHash"] = json!("sha256:digest-2");
        digest_only["digest"]["content"] = json!("changed digest");
        apply_literature_digest(&apps, digest_only).expect("digest-only apply");
        let repository = owner.lock().expect("repository");
        assert_eq!(
            repository.list_raw_references().expect("references"),
            raw_before
        );
        assert_eq!(
            repository
                .get_cache_basis("citation-graph:library")
                .expect("graph cache")
                .expect("graph cache row")
                .status,
            "ready"
        );
        drop(repository);

        let mut citation_only = request.clone();
        citation_only["citationAnalysis"]["payloadHash"] = json!("sha256:citation-2");
        citation_only["citationAnalysis"]["citations"][0]["role"] = json!("method");
        apply_literature_digest(&apps, citation_only).expect("citation-only apply");
        let repository = owner.lock().expect("repository");
        assert!(
            repository.list_raw_references().expect("references")[0]
                .roles_json
                .contains("method")
        );
        assert_eq!(
            repository
                .get_cache_basis("citation-graph:library")
                .expect("graph cache")
                .expect("graph cache row")
                .status,
            "stale"
        );
        drop(repository);

        let mut ambiguous = request.clone();
        ambiguous["matchedReferences"] = json!([
            {"libraryId":1,"itemKey":"BBBB2222","paperRef":"1:BBBB2222","title":"Matched paper","year":"2024"},
            {"libraryId":1,"itemKey":"CCCC3333","paperRef":"1:CCCC3333","title":"Matched paper","year":"2024"}
        ]);
        apply_literature_digest(&apps, ambiguous).expect("ambiguous title-year apply");
        let repository = owner.lock().expect("repository");
        assert!(
            repository
                .list_reference_bindings()
                .expect("bindings")
                .is_empty()
        );
        let before_failure = repository.list_raw_references().expect("references");
        drop(repository);

        let mut invalid = request.clone();
        invalid["references"]["payloadHash"] = json!("sha256:references-invalid");
        invalid["references"]["references"] = json!("not-an-array");
        assert!(apply_literature_digest(&apps, invalid).is_err());
        assert_eq!(
            owner
                .lock()
                .expect("repository")
                .list_raw_references()
                .expect("references"),
            before_failure
        );

        let mut missing_references = request;
        missing_references
            .as_object_mut()
            .expect("request object")
            .remove("references");
        missing_references["citationAnalysis"] = Value::Null;
        let missing = apply_literature_digest(&apps, missing_references)
            .expect("missing references artifact");
        assert_eq!(missing["reference_count"], 0);
        assert!(
            owner
                .lock()
                .expect("repository")
                .list_raw_references()
                .expect("references")
                .is_empty()
        );
    }

    #[test]
    fn topic_discovery_public_adapter_preserves_stable_shape() {
        let root = test_root();
        let apps = test_applications(&root);
        {
            let owner = apps.repository.owner();
            let repository = owner.lock().expect("repository");
            repository
                .execute(
                    "INSERT INTO synt_topic_discovery_hint(
                     hint_id,payload_json,updated_at
                     ) VALUES('hint:1','{\"hint_id\":\"hint:1\",\"status\":\"open\"}','1')",
                    &[],
                )
                .expect("hint");
        }
        let rejected = dispatch_legacy_client(
            &apps,
            "client.rejectTopicDiscoveryHint",
            &[json!({"hintId":"hint:1"})],
        )
        .expect("reject hint");
        assert_eq!(rejected["status"], "rejected");
        assert_eq!(rejected["hint"]["status"], "rejected");
        drop(apps);
        let _ = std::fs::remove_dir_all(root);
    }
}
