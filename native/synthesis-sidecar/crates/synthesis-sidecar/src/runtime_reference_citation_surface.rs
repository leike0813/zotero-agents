use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use synthesis_application::reference::{CanonicalMutationStatus, CanonicalReferenceMutation};
use synthesis_application::reference_matching::{ReferenceReviewAction, ReferenceReviewDecision};

use crate::runtime_production_client::{
    ProductionClientCanonicalEffect, ProductionClientRouteEntry,
};
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::checkpoint_current_before_promotion;
use synthesis_application::reference_application::{
    CanonicalArchiveRequest, CanonicalMergeBatchRequest, CanonicalMetadataUpdateRequest,
    CanonicalRevisionReviewRequest, EffectiveCanonicalMergeRequest, ExternalReferenceRankRequest,
    ReferenceAttentionRequest, ReferenceIndexRequest, ReferenceMatchingCommand,
    ReferenceRefreshCommand,
};

#[derive(serde::Deserialize)]
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

fn optional_one<T: DeserializeOwned + Default>(args: &[Value]) -> Result<T, String> {
    match args {
        [] => Ok(T::default()),
        [value] => serde_json::from_value(value.clone()).map_err(|_| "invalid_request".into()),
        _ => Err("invalid_request".into()),
    }
}

#[derive(Default, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct EmptyRequest {}

#[derive(serde::Deserialize)]
#[serde(rename_all = "snake_case")]
enum ReferenceReviewActionWire {
    Accept,
    ReverseAccept,
    Reject,
    Reopen,
    Delete,
    ManualTarget,
}

#[derive(serde::Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
enum ReferenceReviewTargetWire {
    ZoteroItem { library_id: i64, item_key: String },
    CanonicalReference { canonical_reference_id: String },
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct ReferenceReviewDecisionWire {
    proposal_id: String,
    action: ReferenceReviewActionWire,
    target: Option<ReferenceReviewTargetWire>,
}

#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct ReferenceReviewDecisionBatchWire {
    decisions: Vec<ReferenceReviewDecisionWire>,
}

fn no_args(args: &[Value]) -> Result<(), String> {
    if args.is_empty() {
        Ok(())
    } else {
        Err("invalid_request".into())
    }
}

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    checkpoint_current_before_promotion(apps)
}

fn reference_review_decision(
    decision: ReferenceReviewDecisionWire,
) -> Result<ReferenceReviewDecision, String> {
    if decision.proposal_id.trim().is_empty() {
        return Err("invalid_request".into());
    }
    let mut result = ReferenceReviewDecision {
        proposal_id: decision.proposal_id.trim().to_owned(),
        action: match decision.action {
            ReferenceReviewActionWire::Accept => ReferenceReviewAction::Accept,
            ReferenceReviewActionWire::ReverseAccept => ReferenceReviewAction::Reverse,
            ReferenceReviewActionWire::Reject => ReferenceReviewAction::Reject,
            ReferenceReviewActionWire::Reopen => ReferenceReviewAction::Reopen,
            ReferenceReviewActionWire::Delete => ReferenceReviewAction::Delete,
            ReferenceReviewActionWire::ManualTarget => ReferenceReviewAction::Retarget,
        },
        target_canonical_reference_id: String::new(),
        target_library_id: 0,
        target_item_key: String::new(),
    };
    match (result.action, decision.target) {
        (
            ReferenceReviewAction::Retarget,
            Some(ReferenceReviewTargetWire::ZoteroItem {
                library_id,
                item_key,
            }),
        ) if library_id > 0 && !item_key.trim().is_empty() => {
            result.target_library_id = library_id;
            result.target_item_key = item_key.trim().to_owned();
        }
        (
            ReferenceReviewAction::Retarget,
            Some(ReferenceReviewTargetWire::CanonicalReference {
                canonical_reference_id,
            }),
        ) if !canonical_reference_id.trim().is_empty() => {
            result.target_canonical_reference_id = canonical_reference_id.trim().to_owned();
        }
        (ReferenceReviewAction::Retarget, _) | (_, Some(_)) => return Err("invalid_request".into()),
        (_, None) => {}
    }
    Ok(result)
}

fn reference_review_decisions(
    request: ReferenceReviewDecisionBatchWire,
) -> Result<Vec<ReferenceReviewDecision>, String> {
    if request.decisions.is_empty() || request.decisions.len() > 100 {
        return Err("invalid_request".into());
    }
    request
        .decisions
        .into_iter()
        .map(reference_review_decision)
        .collect()
}

pub(crate) const REFERENCE_CITATION_CLIENT_ROUTES: &[ProductionClientRouteEntry] = &[
    ProductionClientRouteEntry::new("client.consumeRelatedItemsSyncEcho", |apps, args| {
        let request = one::<RelatedItemsEchoRequest>(args)?;
        apps.consume_related_items_sync_echo(
            request.library_id,
            &request.item_key,
            request.related_item_key.as_deref(),
        )
    }),
    ProductionClientRouteEntry::new("client.getReferenceSidecarIndex", |apps, args| {
        apps.references
            .sidecar_index(&optional_one::<ReferenceIndexRequest>(args)?)
    }),
    ProductionClientRouteEntry::new("client.rankExternalReferences", |apps, args| {
        apps.references
            .rank_external_references(&optional_one::<ExternalReferenceRankRequest>(args)?)
    }),
    ProductionClientRouteEntry::new("client.getAttentionQueue", |apps, args| {
        apps.references
            .attention_queue(&optional_one::<ReferenceAttentionRequest>(args)?)
    }),
    ProductionClientRouteEntry::new("client.getReviewInput", |apps, args| {
        crate::runtime_topic_workbench_surface::dispatch_workflow_review_input(apps, args)
    }),
    ProductionClientRouteEntry::new("client.startReferenceSidecarRefresh", |apps, args| {
        optional_one::<EmptyRequest>(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.references
            .refresh(ReferenceRefreshCommand::Run, &checkpoint)
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::ReferencePromotion),
    ProductionClientRouteEntry::new("client.refreshReferenceSidecarNow", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.references
            .refresh(ReferenceRefreshCommand::Run, &checkpoint)
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::ReferencePromotion),
    ProductionClientRouteEntry::new("client.retryReferenceSidecarRefresh", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.references
            .refresh(ReferenceRefreshCommand::Retry, &checkpoint)
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::ReferencePromotion),
    ProductionClientRouteEntry::new("client.runAdvancedReferenceMatchingNow", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.references
            .match_references(ReferenceMatchingCommand::Run, &checkpoint)
    }),
    ProductionClientRouteEntry::new("client.retryAdvancedReferenceMatching", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.references
            .match_references(ReferenceMatchingCommand::Retry, &checkpoint)
    }),
    ProductionClientRouteEntry::new("client.applyCanonicalRevisionReviewAction", |apps, args| {
        let checkpoint = || promotion_checkpoint(apps);
        apps.references
            .apply_revision_review(one::<CanonicalRevisionReviewRequest>(args)?, &checkpoint)
    }),
    ProductionClientRouteEntry::new("client.applyReferenceMatchProposalAction", |apps, args| {
        let decision = reference_review_decision(one::<ReferenceReviewDecisionWire>(args)?)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.references
            .apply_proposal_actions(std::slice::from_ref(&decision), &checkpoint)
    }),
    ProductionClientRouteEntry::new("client.applyReferenceMatchProposalActions", |apps, args| {
        let decisions = reference_review_decisions(one::<ReferenceReviewDecisionBatchWire>(args)?)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.references
            .apply_proposal_actions(&decisions, &checkpoint)
    }),
    ProductionClientRouteEntry::new("client.mergeEffectiveCanonicalReference", |apps, args| {
        let checkpoint = || promotion_checkpoint(apps);
        apps.references
            .merge_canonical(one::<EffectiveCanonicalMergeRequest>(args)?, &checkpoint)
    }),
    ProductionClientRouteEntry::new(
        "client.applyCanonicalRevisionMergeRequests",
        |apps, args| {
            let checkpoint = || promotion_checkpoint(apps);
            apps.references
                .merge_canonical_batch(one::<CanonicalMergeBatchRequest>(args)?, &checkpoint)
        },
    ),
    ProductionClientRouteEntry::new("client.updateCanonicalReferenceMetadata", |apps, args| {
        let request = one::<CanonicalMetadataUpdateRequest>(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        let receipt = apps
            .references
            .mutate_canonicals(
                CanonicalReferenceMutation::UpdateMetadata {
                    canonical_reference_id: request.canonical_reference_id,
                    title: request.patch.title,
                    normalized_title: request.patch.normalized_title,
                    normalized_title_derived: false,
                    year: request.patch.year,
                    authors: request.patch.authors,
                    identifiers: request.patch.identifiers,
                },
                &checkpoint,
            )
            .map_err(|error| error.code().to_owned())?;
        let mut result = match receipt.status {
            CanonicalMutationStatus::Updated => json!({
                "ok":true,
                "status":"updated",
                "canonical_reference_id":receipt.canonical_reference_id,
            }),
            CanonicalMutationStatus::MissingCanonical => json!({
                "ok":false,
                "status":"missing_canonical",
                "error":{
                    "code":"canonical_metadata_missing_canonical",
                    "details":{"canonicalReferenceId":receipt.canonical_reference_id},
                },
            }),
            CanonicalMutationStatus::BoundToZotero => json!({
                "ok":false,
                "status":"bound_to_zotero",
                "error":{
                    "code":"canonical_metadata_bound_to_zotero",
                    "details":{"canonicalReferenceId":receipt.canonical_reference_id},
                },
            }),
            CanonicalMutationStatus::Stopping => return Err("operation_canceled".into()),
            _ => return Err("canonical_mutation_result_invalid".into()),
        };
        if receipt.idempotent {
            result["idempotent"] = Value::Bool(true);
        }
        Ok(result)
    }),
    ProductionClientRouteEntry::new("client.archiveCanonicalReference", |apps, args| {
        let request = one::<CanonicalArchiveRequest>(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        let receipt = apps
            .references
            .mutate_canonicals(
                CanonicalReferenceMutation::Archive {
                    canonical_reference_id: request.canonical_reference_id,
                },
                &checkpoint,
            )
            .map_err(|error| error.code().to_owned())?;
        let mut result = match receipt.status {
            CanonicalMutationStatus::Archived | CanonicalMutationStatus::AlreadyArchived => json!({
                "ok":true,
                "status":"archived",
                "canonical_reference_id":receipt.canonical_reference_id,
            }),
            CanonicalMutationStatus::Blocked => json!({
                "ok":false,
                "status":"blocked",
                "error":{
                    "code":"canonical_archive_blocked",
                    "details":{
                        "canonicalReferenceId":receipt.canonical_reference_id,
                        "blockers":receipt.blockers,
                    },
                },
            }),
            CanonicalMutationStatus::MissingCanonical => json!({
                "ok":false,
                "status":"missing_canonical",
                "error":{
                    "code":"canonical_archive_missing_canonical",
                    "details":{"canonicalReferenceId":receipt.canonical_reference_id},
                },
            }),
            CanonicalMutationStatus::Stopping => return Err("operation_canceled".into()),
            CanonicalMutationStatus::Updated | CanonicalMutationStatus::BoundToZotero => {
                return Err("canonical_mutation_result_invalid".into());
            }
        };
        if receipt.idempotent {
            result["idempotent"] = Value::Bool(true);
        }
        Ok(result)
    }),
    ProductionClientRouteEntry::new("client.queryCitationGraph", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.queryCitationGraph",
            args,
        )
    }),
    ProductionClientRouteEntry::new("client.queryCitationGraphCluster", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.queryCitationGraphCluster",
            args,
        )
    }),
    ProductionClientRouteEntry::new("client.getCitationGraphSlice", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.getCitationGraphSlice",
            args,
        )
    }),
    ProductionClientRouteEntry::new("client.getCitationGraphLayout", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.getCitationGraphLayout",
            args,
        )
    }),
    ProductionClientRouteEntry::new("client.getCitationGraphMetrics", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(
            apps,
            "client.getCitationGraphMetrics",
            args,
        )
    }),
    ProductionClientRouteEntry::new("client.rankLibraryPapers", |apps, args| {
        crate::runtime_citation_graph_read_surface::dispatch(apps, "client.rankLibraryPapers", args)
    }),
    ProductionClientRouteEntry::new("client.recomputeCitationGraphLayout", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.recomputeCitationGraphLayout",
            args,
        )
    }),
    ProductionClientRouteEntry::new("client.refreshCitationGraphMetricsNow", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.refreshCitationGraphMetricsNow",
            args,
        )
    }),
    ProductionClientRouteEntry::new("client.startCitationGraphUpdate", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.startCitationGraphUpdate",
            args,
        )
    }),
    ProductionClientRouteEntry::new("client.rebuildCitationGraphCacheNow", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.rebuildCitationGraphCacheNow",
            args,
        )
    }),
    ProductionClientRouteEntry::new(
        "client.refreshCitationGraphCacheIncrementalNow",
        |apps, args| {
            crate::runtime_citation_graph_commands::dispatch(
                apps,
                "client.refreshCitationGraphCacheIncrementalNow",
                args,
            )
        },
    ),
    ProductionClientRouteEntry::new("client.retryCitationGraphCacheRebuild", |apps, args| {
        crate::runtime_citation_graph_commands::dispatch(
            apps,
            "client.retryCitationGraphCacheRebuild",
            args,
        )
    }),
];

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
            Arc::new(synthesis_application::RepositoryPort::new(Arc::new(
                Mutex::new(repository),
            ))),
            Arc::new(Mutex::new(canonical)),
            Arc::new(NativeComputePool::new()),
            None,
            "service".into(),
            root.join("webdav-state.json"),
        )
        .expect("applications")
    }

    fn dispatch_owned(
        apps: &ProductionApplications,
        capability: &str,
        args: &[Value],
    ) -> Result<Value, String> {
        let route = REFERENCE_CITATION_CLIENT_ROUTES
            .iter()
            .find(|route| route.capability == capability)
            .expect("owned capability");
        (route.handler)(apps, args)
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
                "confirmRetargetGroup":false,
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
