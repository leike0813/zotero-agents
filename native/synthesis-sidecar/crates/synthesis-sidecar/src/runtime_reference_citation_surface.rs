use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use synthesis_application::reference_matching::{ReferenceReviewAction, ReferenceReviewDecision};

use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::{
    checkpoint_before_promotion, current_operation_id,
};
use crate::runtime_reference_canonical::{
    CanonicalArchiveRequest, CanonicalMergeBatchRequest, CanonicalMetadataUpdateRequest,
    CanonicalRevisionReviewRequest, EffectiveCanonicalMergeRequest,
};

fn one<T: DeserializeOwned>(args: &[Value]) -> Result<T, String> {
    match args {
        [value] => serde_json::from_value(value.clone()).map_err(|_| "invalid_request".into()),
        _ => Err("invalid_request".into()),
    }
}

fn optional_one<T: DeserializeOwned + Default>(args: &[Value]) -> Result<T, String> {
    match args {
        [] => Ok(T::default()),
        [value] => serde_json::from_value(value.clone()).map_err(|_| "invalid_request".into()),
        _ => Err("invalid_request".into()),
    }
}

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    let Some(operation_id) = current_operation_id() else {
        return Ok(());
    };
    checkpoint_before_promotion(apps, &operation_id, &synthesis_protocol::utc_now_iso8601())
}

fn reference_review_decisions(args: &[Value]) -> Result<Vec<ReferenceReviewDecision>, String> {
    let decisions = match args {
        [Value::Array(decisions)] => decisions.clone(),
        [Value::Object(request)] if request.contains_key("decisions") => request
            .get("decisions")
            .and_then(Value::as_array)
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?,
        [decision @ Value::Object(_)] => vec![decision.clone()],
        _ => return Err("invalid_request".into()),
    };
    if decisions.is_empty() || decisions.len() > 100 {
        return Err("invalid_request".into());
    }
    decisions
        .into_iter()
        .map(|decision| {
            let object = decision
                .as_object()
                .ok_or_else(|| "invalid_request".to_owned())?;
            if object
                .keys()
                .any(|key| !matches!(key.as_str(), "proposalId" | "action" | "target"))
            {
                return Err("invalid_request".into());
            }
            let proposal_id = object
                .get("proposalId")
                .and_then(Value::as_str)
                .filter(|value| !value.trim().is_empty())
                .ok_or_else(|| "invalid_request".to_owned())?
                .trim()
                .to_owned();
            let action = object
                .get("action")
                .and_then(Value::as_str)
                .ok_or_else(|| "invalid_request".to_owned())?;
            let mut result = ReferenceReviewDecision {
                proposal_id,
                action: match action {
                    "accept" => ReferenceReviewAction::Accept,
                    "reverse_accept" => ReferenceReviewAction::Reverse,
                    "reject" => ReferenceReviewAction::Reject,
                    "reopen" => ReferenceReviewAction::Reopen,
                    "delete" => ReferenceReviewAction::Delete,
                    "manual_target" => ReferenceReviewAction::Retarget,
                    _ => return Err("invalid_request".into()),
                },
                target_canonical_reference_id: String::new(),
                target_library_id: 0,
                target_item_key: String::new(),
            };
            if action == "manual_target" {
                let target = object
                    .get("target")
                    .and_then(Value::as_object)
                    .ok_or_else(|| "invalid_request".to_owned())?;
                match target.get("kind").and_then(Value::as_str) {
                    Some("zotero_item") => {
                        if target
                            .keys()
                            .any(|key| !matches!(key.as_str(), "kind" | "libraryId" | "itemKey"))
                        {
                            return Err("invalid_request".into());
                        }
                        result.target_library_id = target
                            .get("libraryId")
                            .and_then(Value::as_i64)
                            .filter(|value| *value > 0)
                            .ok_or_else(|| "invalid_request".to_owned())?;
                        result.target_item_key = target
                            .get("itemKey")
                            .and_then(Value::as_str)
                            .filter(|value| !value.trim().is_empty())
                            .ok_or_else(|| "invalid_request".to_owned())?
                            .trim()
                            .to_owned();
                    }
                    Some("canonical_reference") => {
                        if target
                            .keys()
                            .any(|key| !matches!(key.as_str(), "kind" | "canonicalReferenceId"))
                        {
                            return Err("invalid_request".into());
                        }
                        result.target_canonical_reference_id = target
                            .get("canonicalReferenceId")
                            .and_then(Value::as_str)
                            .filter(|value| !value.trim().is_empty())
                            .ok_or_else(|| "invalid_request".to_owned())?
                            .trim()
                            .to_owned();
                    }
                    _ => return Err("invalid_request".into()),
                }
            } else if object.contains_key("target") {
                return Err("invalid_request".into());
            }
            Ok(result)
        })
        .collect()
}

type ProductionClientHandler = fn(&ProductionApplications, &[Value]) -> Result<Value, String>;

struct RegisteredProductionClientHandler {
    capability: &'static str,
    dispatch: ProductionClientHandler,
}

macro_rules! register_production_client_handlers {
    ($(($capability:literal, $handler:expr)),+ $(,)?) => {
        const REFERENCE_CITATION_CLIENT_HANDLERS: &[RegisteredProductionClientHandler] = &[
            $(RegisteredProductionClientHandler { capability: $capability, dispatch: $handler }),+
        ];
    };
}

register_production_client_handlers!(
    ("client.getReferenceSidecarIndex", |apps, args| {
        apps.reference_canonical
            .sidecar_index(&optional_one::<Value>(args)?)
    }),
    ("client.rankExternalReferences", |apps, args| {
        apps.reference_canonical
            .rank_external_references(&optional_one::<Value>(args)?)
    }),
    ("client.getAttentionQueue", |apps, args| {
        apps.reference_canonical
            .attention_queue(&optional_one::<Value>(args)?)
    }),
    ("client.getReviewInput", |apps, args| {
        let request = optional_one::<Value>(args)?;
        Ok(json!({
            "reference":apps.reference_canonical.review_input(&request)?,
            "concept":apps.concepts.load()?.reviews,
            "topicGraph":apps.topic_graph.load()?.reviews,
        }))
    }),
    ("client.startReferenceSidecarRefresh", |apps, args| {
        let request = optional_one::<Value>(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .start_refresh_with_checkpoint(&request, &checkpoint)
    }),
    ("client.refreshReferenceSidecarNow", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .refresh_now_with_checkpoint(&checkpoint)
    }),
    ("client.retryReferenceSidecarRefresh", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .retry_refresh_with_checkpoint(&checkpoint)
    }),
    ("client.runAdvancedReferenceMatchingNow", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .run_advanced_matching_with_checkpoint(&checkpoint)
    }),
    ("client.retryAdvancedReferenceMatching", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .retry_advanced_matching_with_checkpoint(&checkpoint)
    }),
    ("client.applyCanonicalRevisionReviewAction", |apps, args| {
        apps.reference_canonical
            .apply_revision_review(one::<CanonicalRevisionReviewRequest>(args)?)
    }),
    ("client.applyReferenceMatchProposalAction", |apps, args| {
        apps.reference_canonical
            .apply_proposal_actions(&reference_review_decisions(args)?)
    }),
    ("client.applyReferenceMatchProposalActions", |apps, args| {
        apps.reference_canonical
            .apply_proposal_actions(&reference_review_decisions(args)?)
    }),
    ("client.mergeEffectiveCanonicalReference", |apps, args| {
        apps.reference_canonical
            .merge_canonical(one::<EffectiveCanonicalMergeRequest>(args)?)
    }),
    (
        "client.applyCanonicalRevisionMergeRequests",
        |apps, args| {
            apps.reference_canonical
                .merge_canonical_batch(one::<CanonicalMergeBatchRequest>(args)?)
        }
    ),
    ("client.updateCanonicalReferenceMetadata", |apps, args| {
        apps.reference_canonical
            .update_canonical_metadata(one::<CanonicalMetadataUpdateRequest>(args)?)
    }),
    ("client.archiveCanonicalReference", |apps, args| {
        apps.reference_canonical
            .archive_canonical(one::<CanonicalArchiveRequest>(args)?)
    }),
    ("client.queryCitationGraph", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.queryCitationGraph",
            args,
        )
    }),
    ("client.queryCitationGraphCluster", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.queryCitationGraphCluster",
            args,
        )
    }),
    ("client.getCitationGraphSlice", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.getCitationGraphSlice",
            args,
        )
    }),
    ("client.getCitationGraphLayout", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.getCitationGraphLayout",
            args,
        )
    }),
    ("client.getCitationGraphMetrics", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.getCitationGraphMetrics",
            args,
        )
    }),
    ("client.rankLibraryPapers", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(apps, "client.rankLibraryPapers", args)
    }),
    ("client.recomputeCitationGraphLayout", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.recomputeCitationGraphLayout",
            args,
        )
    }),
    ("client.refreshCitationGraphMetricsNow", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.refreshCitationGraphMetricsNow",
            args,
        )
    }),
    ("client.startCitationGraphUpdate", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.startCitationGraphUpdate",
            args,
        )
    }),
    ("client.rebuildCitationGraphCacheNow", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.rebuildCitationGraphCacheNow",
            args,
        )
    }),
    (
        "client.refreshCitationGraphCacheIncrementalNow",
        |apps, args| {
            crate::runtime_citation_graph_commands::dispatch(
                apps,
                "client.refreshCitationGraphCacheIncrementalNow",
                args,
            )
        }
    ),
    ("client.retryCitationGraphCacheRebuild", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.retryCitationGraphCacheRebuild",
            args,
        )
    }),
);

pub(crate) fn dispatch(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Option<Result<Value, String>> {
    REFERENCE_CITATION_CLIENT_HANDLERS
        .iter()
        .find(|handler| handler.capability == capability)
        .map(|handler| (handler.dispatch)(apps, args))
}

#[cfg(test)]
pub(crate) fn dispatched_capabilities() -> impl Iterator<Item = &'static str> {
    REFERENCE_CITATION_CLIENT_HANDLERS
        .iter()
        .map(|handler| handler.capability)
}

#[cfg(test)]
mod tests {
    use std::path::{Path, PathBuf};
    use std::sync::{Arc, Mutex};
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;
    use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
    use synthesis_repository::{CanonicalReferenceRecord, Repository, RepositoryIdentity};

    use crate::runtime_production_ports::build_production_applications;
    use crate::runtime_worker_pool::NativeComputePool;

    fn test_root() -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-reference-citation-surface-{}-{}",
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

    fn dispatch_owned(
        apps: &ProductionApplications,
        capability: &str,
        args: &[Value],
    ) -> Result<Value, String> {
        dispatch(apps, capability, args).expect("owned capability")
    }

    #[test]
    fn adapter_has_the_closed_twenty_eight_operation_slice() {
        assert_eq!(REFERENCE_CITATION_CLIENT_HANDLERS.len(), 28);
        let mut capabilities = REFERENCE_CITATION_CLIENT_HANDLERS
            .iter()
            .map(|handler| handler.capability)
            .collect::<Vec<_>>();
        capabilities.sort_unstable();
        capabilities.dedup();
        assert_eq!(capabilities.len(), 28);
    }

    #[test]
    fn reference_reads_and_public_no_arg_jobs_keep_their_boundaries() {
        let root = test_root();
        let apps = test_applications(&root);
        let index =
            dispatch_owned(&apps, "client.getReferenceSidecarIndex", &[json!({})]).expect("index");
        assert_eq!(index["rows"], json!([]));
        assert_eq!(index["cursor"], "0");
        assert_eq!(index["next_cursor"], "");
        assert_eq!(index["has_more"], false);

        let ranked =
            dispatch_owned(&apps, "client.rankExternalReferences", &[json!({})]).expect("ranking");
        assert_eq!(ranked["items"], json!([]));
        assert_eq!(ranked["nextCursor"], "");
        assert_eq!(ranked["hasMore"], false);

        let attention =
            dispatch_owned(&apps, "client.getAttentionQueue", &[json!({})]).expect("attention");
        assert_eq!(attention["ok"], true);
        assert!(attention["items"].is_array());

        let review =
            dispatch_owned(&apps, "client.getReviewInput", &[json!({})]).expect("review input");
        assert!(review["reference"]["records"].is_array());
        assert!(review["concept"].is_array());
        assert!(review["topicGraph"].is_array());

        for capability in [
            "client.refreshReferenceSidecarNow",
            "client.retryReferenceSidecarRefresh",
            "client.runAdvancedReferenceMatchingNow",
            "client.retryAdvancedReferenceMatching",
        ] {
            assert_eq!(
                dispatch_owned(&apps, capability, &[]),
                Err("reverse_host_unavailable".into()),
                "{capability} must accept the public no-argument boundary",
            );
        }
        drop(apps);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn malformed_refresh_scope_is_rejected_before_job_or_host_work() {
        let root = test_root();
        let apps = test_applications(&root);
        assert_eq!(
            dispatch_owned(
                &apps,
                "client.startReferenceSidecarRefresh",
                &[json!({"scope":"invalid"})],
            ),
            Err("invalid_request".into()),
        );
        assert!(
            apps.repository
                .owner()
                .lock()
                .expect("repository")
                .list_operations(&synthesis_repository::OperationQuery {
                    include_completed: true,
                    limit: 10,
                    ..synthesis_repository::OperationQuery::default()
                })
                .expect("operations")
                .is_empty()
        );
        drop(apps);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn canonical_requests_are_strict_before_application_mutation() {
        let root = test_root();
        let apps = test_applications(&root);
        {
            let owner = apps.repository.owner();
            let mut repository = owner.lock().expect("repository");
            for id in ["canonical:source", "canonical:target"] {
                repository
                    .upsert_canonical_reference_record(&CanonicalReferenceRecord {
                        canonical_reference_id: id.into(),
                        title: id.into(),
                        normalized_title: id.into(),
                        authors_json: "[]".into(),
                        identifiers_json: "{}".into(),
                        metadata_hash: "sha256:metadata".into(),
                        status: "active".into(),
                        created_at: "1".into(),
                        updated_at: "1".into(),
                        ..CanonicalReferenceRecord::default()
                    })
                    .expect("canonical");
            }
        }
        let merged = dispatch_owned(
            &apps,
            "client.mergeEffectiveCanonicalReference",
            &[json!({
                "sourceEffectiveCanonicalId":"canonical:source",
                "targetEffectiveCanonicalId":"canonical:target",
            })],
        )
        .expect("merge");
        assert_eq!(merged["status"], "merged");

        assert_eq!(
            dispatch_owned(
                &apps,
                "client.updateCanonicalReferenceMetadata",
                &[json!({
                    "canonicalReferenceId":"canonical:target",
                    "patch":{"title":"Title"},
                    "unexpected":true,
                })],
            ),
            Err("invalid_request".into()),
        );
        drop(apps);
        let _ = std::fs::remove_dir_all(root);
    }

    #[test]
    fn citation_commands_validate_only_the_public_boundary() {
        let root = test_root();
        let apps = test_applications(&root);

        for capability in [
            "client.rebuildCitationGraphCacheNow",
            "client.refreshCitationGraphCacheIncrementalNow",
            "client.retryCitationGraphCacheRebuild",
        ] {
            assert_ne!(
                dispatch_owned(&apps, capability, &[]),
                Err("invalid_request".into()),
                "{capability} must accept the public no-argument boundary",
            );
            assert_eq!(
                dispatch_owned(&apps, capability, &[json!({})]),
                Err("invalid_request".into()),
                "{capability} must reject public arguments",
            );
        }

        assert_ne!(
            dispatch_owned(
                &apps,
                "client.startCitationGraphUpdate",
                &[json!({
                    "scope":"papers",
                    "paperRefs":["1:AAAA1111"],
                    "expectedReferenceBasisHash":"sha256:reference",
                    "idempotencyKey":"graph-update-a",
                })],
            ),
            Err("invalid_request".into()),
        );
        assert_ne!(
            dispatch_owned(
                &apps,
                "client.refreshCitationGraphMetricsNow",
                &[json!({"graphHash":"sha256:graph"})],
            ),
            Err("invalid_request".into()),
        );
        assert_ne!(
            dispatch_owned(
                &apps,
                "client.recomputeCitationGraphLayout",
                &[json!({"algorithm":"radial","force":true})],
            ),
            Err("invalid_request".into()),
        );
        assert_eq!(
            dispatch_owned(
                &apps,
                "client.startCitationGraphUpdate",
                &[json!({"scope":"library","libraryId":1})],
            ),
            Err("invalid_request".into()),
        );
        assert_eq!(
            dispatch_owned(
                &apps,
                "client.recomputeCitationGraphLayout",
                &[json!({"algorithm":"radial","force":true,"input":{}})],
            ),
            Err("invalid_request".into()),
        );
        drop(apps);
        let _ = std::fs::remove_dir_all(root);
    }
}
