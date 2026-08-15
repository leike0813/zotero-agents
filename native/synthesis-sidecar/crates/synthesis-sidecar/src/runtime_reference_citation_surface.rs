use serde::de::DeserializeOwned;
use serde_json::Value;
#[cfg(test)]
use serde_json::json;
use synthesis_application::reference_matching::{ReferenceReviewAction, ReferenceReviewDecision};

use crate::runtime_production_client::{
    ProductionClientCanonicalEffect, ProductionClientRouteEntry,
};
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::checkpoint_current_before_promotion;
use crate::runtime_reference_canonical::{
    CanonicalArchiveRequest, CanonicalMergeBatchRequest, CanonicalMetadataUpdateRequest,
    CanonicalRevisionReviewRequest, EffectiveCanonicalMergeRequest, ExternalReferenceRankRequest,
    ReferenceAttentionRequest, ReferenceIndexRequest,
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
        apps.reference_canonical
            .sidecar_index(&optional_one::<ReferenceIndexRequest>(args)?)
    }),
    ProductionClientRouteEntry::new("client.rankExternalReferences", |apps, args| {
        apps.reference_canonical
            .rank_external_references(&optional_one::<ExternalReferenceRankRequest>(args)?)
    }),
    ProductionClientRouteEntry::new("client.getAttentionQueue", |apps, args| {
        apps.reference_canonical
            .attention_queue(&optional_one::<ReferenceAttentionRequest>(args)?)
    }),
    ProductionClientRouteEntry::new("client.getReviewInput", |apps, args| {
        crate::runtime_topic_workbench_surface::dispatch_workflow_review_input(apps, args)
    }),
    ProductionClientRouteEntry::new("client.startReferenceSidecarRefresh", |apps, args| {
        optional_one::<EmptyRequest>(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .start_refresh_with_checkpoint(&checkpoint)
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::ReferencePromotion),
    ProductionClientRouteEntry::new("client.refreshReferenceSidecarNow", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .refresh_now_with_checkpoint(&checkpoint)
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::ReferencePromotion),
    ProductionClientRouteEntry::new("client.retryReferenceSidecarRefresh", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .retry_refresh_with_checkpoint(&checkpoint)
    })
    .with_canonical_effect(ProductionClientCanonicalEffect::ReferencePromotion),
    ProductionClientRouteEntry::new("client.runAdvancedReferenceMatchingNow", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .run_advanced_matching_with_checkpoint(&checkpoint)
    }),
    ProductionClientRouteEntry::new("client.retryAdvancedReferenceMatching", |apps, args| {
        no_args(args)?;
        let checkpoint = || promotion_checkpoint(apps);
        apps.reference_canonical
            .retry_advanced_matching_with_checkpoint(&checkpoint)
    }),
    ProductionClientRouteEntry::new("client.applyCanonicalRevisionReviewAction", |apps, args| {
        apps.reference_canonical
            .apply_revision_review(one::<CanonicalRevisionReviewRequest>(args)?)
    }),
    ProductionClientRouteEntry::new("client.applyReferenceMatchProposalAction", |apps, args| {
        let decision = reference_review_decision(one::<ReferenceReviewDecisionWire>(args)?)?;
        apps.reference_canonical
            .apply_proposal_actions(std::slice::from_ref(&decision))
    }),
    ProductionClientRouteEntry::new("client.applyReferenceMatchProposalActions", |apps, args| {
        let decisions = reference_review_decisions(one::<ReferenceReviewDecisionBatchWire>(args)?)?;
        apps.reference_canonical.apply_proposal_actions(&decisions)
    }),
    ProductionClientRouteEntry::new("client.mergeEffectiveCanonicalReference", |apps, args| {
        apps.reference_canonical
            .merge_canonical(one::<EffectiveCanonicalMergeRequest>(args)?)
    }),
    ProductionClientRouteEntry::new(
        "client.applyCanonicalRevisionMergeRequests",
        |apps, args| {
            apps.reference_canonical
                .merge_canonical_batch(one::<CanonicalMergeBatchRequest>(args)?)
        },
    ),
    ProductionClientRouteEntry::new("client.updateCanonicalReferenceMetadata", |apps, args| {
        apps.reference_canonical
            .update_canonical_metadata(one::<CanonicalMetadataUpdateRequest>(args)?)
    }),
    ProductionClientRouteEntry::new("client.archiveCanonicalReference", |apps, args| {
        apps.reference_canonical
            .archive_canonical(one::<CanonicalArchiveRequest>(args)?)
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
