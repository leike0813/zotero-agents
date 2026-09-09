use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::{BTreeMap, BTreeSet, HashSet};
#[cfg(test)]
use std::sync::atomic::Ordering;
use synthesis_application::citation_graph::{
    CitationGraphRebuildMaterial, CitationGraphRebuildMode, CitationLayoutRequest,
    CitationMutationResult, CitationMutationStatus,
};
use synthesis_canonical_store::canonical_json_hash;
use synthesis_repository::{
    CacheBasisRecord, CanonicalReferenceRecord, RawReferenceRecord, ReferenceBindingFactRecord,
    ReferenceRedirectFactRecord, ReferenceRedirectGraph,
};

use crate::runtime_host_collection::{
    HostItemCollectionPort, ReferenceHostItem, collect_host_items,
};
use crate::runtime_production_ports::ProductionApplications;
use crate::runtime_public_maintenance_operation::checkpoint_current_before_promotion;

const CACHE_KEY: &str = "citation-graph:library";
const CONTRACT_VERSION: &str = "synthesis-citation-graph-build.v1";
const SOURCE_LIMIT: usize = 25_000;
const REFERENCE_LIMIT: usize = 1_250_000;
const TARGET_LIMIT: usize = 750_000;

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PublicUpdateRequest {
    #[serde(default)]
    scope: Option<String>,
    #[serde(default)]
    paper_refs: Vec<String>,
    #[serde(default)]
    expected_reference_basis_hash: Option<String>,
    #[serde(default)]
    idempotency_key: Option<String>,
}

#[derive(Clone, Debug, Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PublicMetricsRequest {
    #[serde(default)]
    graph_hash: Option<String>,
    #[serde(default)]
    expected_graph_hash: Option<String>,
}

#[derive(Clone, Copy, Debug, Deserialize)]
#[serde(rename_all = "snake_case")]
enum PublicLayoutAlgorithm {
    Force,
    Radial,
    Components,
}

impl PublicLayoutAlgorithm {
    fn as_str(self) -> &'static str {
        match self {
            Self::Force => "force",
            Self::Radial => "radial",
            Self::Components => "components",
        }
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct PublicLayoutRequest {
    algorithm: PublicLayoutAlgorithm,
    #[serde(default)]
    force: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum RebuildIntent {
    Full,
    Incremental,
}

#[derive(Clone, Debug, Default)]
struct StaleDelta {
    source_refs: BTreeSet<String>,
    canonical_ids: BTreeSet<String>,
}

fn one_or_default<T: for<'de> Deserialize<'de> + Default>(args: &[Value]) -> Result<T, String> {
    match args {
        [] => Ok(T::default()),
        [value] => serde_json::from_value(value.clone()).map_err(|_| "invalid_request".into()),
        _ => Err("invalid_request".into()),
    }
}

fn one<T: for<'de> Deserialize<'de>>(args: &[Value]) -> Result<T, String> {
    match args {
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

#[cfg(test)]
fn now_string() -> String {
    synthesis_protocol::utc_now_iso8601()
}

fn wire(result: CitationMutationResult) -> Result<Value, String> {
    serde_json::to_value(result).map_err(|_| "production_projection_invalid".into())
}

fn current_graph_hash(apps: &ProductionApplications) -> Result<Option<String>, String> {
    Ok(apps
        .citations
        .inspect()?
        .graph_hash
        .filter(|hash| !hash.is_empty()))
}

fn parse_string_list(value: &Value) -> BTreeSet<String> {
    value
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(Value::as_str)
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_owned)
        .collect()
}

fn stale_delta(record: Option<&CacheBasisRecord>) -> StaleDelta {
    let mut delta = StaleDelta::default();
    let diagnostics = record
        .and_then(|record| serde_json::from_str::<Value>(&record.diagnostics_json).ok())
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default();
    for diagnostic in diagnostics {
        if diagnostic["code"].as_str() != Some("citation_graph_cache_stale_delta") {
            continue;
        }
        delta
            .source_refs
            .extend(parse_string_list(&diagnostic["source_refs"]));
        for field in [
            "changed_canonical_ids",
            "changed_binding_canonical_ids",
            "changed_redirect_canonical_ids",
        ] {
            delta
                .canonical_ids
                .extend(parse_string_list(&diagnostic[field]));
        }
    }
    delta
}

struct DurableFacts {
    raw: Vec<RawReferenceRecord>,
    canonicals: Vec<CanonicalReferenceRecord>,
    bindings: Vec<ReferenceBindingFactRecord>,
    redirects: Vec<ReferenceRedirectFactRecord>,
    cache_basis: Option<CacheBasisRecord>,
}

fn durable_facts(apps: &ProductionApplications) -> Result<DurableFacts, String> {
    apps.repository.with_reader(|repository| {
        Ok(DurableFacts {
            raw: repository
                .list_raw_references()?
                .into_iter()
                .filter(|row| row.status == "active")
                .collect(),
            canonicals: repository
                .list_canonical_references()?
                .into_iter()
                .filter(|row| row.status == "active")
                .collect(),
            bindings: repository
                .list_reference_bindings()?
                .into_iter()
                .filter(|row| row.status == "accepted")
                .collect(),
            redirects: repository.list_reference_redirects()?,
            cache_basis: repository.get_cache_basis(CACHE_KEY)?,
        })
    })
}

fn affected_source_refs(facts: &DurableFacts, delta: &StaleDelta) -> Result<Vec<String>, String> {
    let redirect_graph = ReferenceRedirectGraph::from_records(&facts.redirects)?;
    let effective_changed = delta
        .canonical_ids
        .iter()
        .map(|canonical| redirect_graph.resolve(canonical))
        .collect::<Result<BTreeSet<_>, _>>()?;
    let mut affected = delta.source_refs.clone();
    for raw in &facts.raw {
        let effective = redirect_graph
            .resolve(&raw.canonical_reference_id)
            .unwrap_or_else(|_| raw.canonical_reference_id.clone());
        if effective_changed.contains(&effective) {
            affected.insert(raw.source_ref.clone());
        }
    }
    Ok(affected.into_iter().collect())
}

fn collect_items_by_ref(
    host: &dyn HostItemCollectionPort,
    paper_refs: &[String],
) -> Result<Vec<ReferenceHostItem>, String> {
    let requested = paper_refs.iter().cloned().collect::<BTreeSet<_>>();
    if requested.len() != paper_refs.len()
        || requested.len() > SOURCE_LIMIT
        || requested.iter().any(|value| value.is_empty())
    {
        return Err("invalid_request".into());
    }
    let mut items = Vec::new();
    let mut missing = BTreeSet::new();
    for chunk in paper_refs.chunks(100) {
        let result = host.get_items_by_ref(chunk)?;
        missing.extend(result.missing_paper_refs);
        items.extend(result.items);
    }
    items.sort_by(|left, right| left.paper_ref.cmp(&right.paper_ref));
    let returned = items
        .iter()
        .map(|item| item.paper_ref.clone())
        .collect::<BTreeSet<_>>();
    if returned.len() != items.len()
        || !returned.is_subset(&requested)
        || !missing.is_subset(&requested)
        || !returned.is_disjoint(&missing)
        || returned.union(&missing).cloned().collect::<BTreeSet<_>>() != requested
    {
        return Err("reverse_host_result_invalid".into());
    }
    Ok(items)
}

fn parse_authors(value: &str) -> Vec<String> {
    serde_json::from_str::<Vec<String>>(value).unwrap_or_default()
}

fn parse_roles(value: &str) -> Vec<String> {
    serde_json::from_str::<Value>(value)
        .ok()
        .and_then(|value| value.as_array().cloned())
        .unwrap_or_default()
        .into_iter()
        .filter_map(|value| match value {
            Value::String(value) => Some(value),
            Value::Object(value) => value
                .get("role")
                .or_else(|| value.get("function"))
                .and_then(Value::as_str)
                .map(str::to_owned),
            _ => None,
        })
        .map(|value| value.trim().to_owned())
        .filter(|value| !value.is_empty())
        .collect()
}

fn build_input(
    facts: &DurableFacts,
    items: Vec<ReferenceHostItem>,
    source_refs: &[String],
    kind: &str,
) -> Result<Value, String> {
    if source_refs.len() > SOURCE_LIMIT || facts.raw.len() > REFERENCE_LIMIT {
        return Err("reverse_host_input_too_large".into());
    }
    let redirect_graph = ReferenceRedirectGraph::from_records(&facts.redirects)?;
    let source_set = source_refs.iter().cloned().collect::<HashSet<_>>();
    let item_by_ref = items
        .into_iter()
        .map(|item| (item.paper_ref.clone(), item))
        .collect::<BTreeMap<_, _>>();
    let canonical_by_id = facts
        .canonicals
        .iter()
        .map(|row| (row.canonical_reference_id.as_str(), row))
        .collect::<BTreeMap<_, _>>();
    let mut binding_by_effective = BTreeMap::new();
    for binding in &facts.bindings {
        binding_by_effective.insert(
            redirect_graph.resolve(&binding.canonical_reference_id)?,
            binding,
        );
    }
    let mut library_nodes = BTreeMap::<String, Value>::new();
    for source_ref in source_refs {
        if let Some(item) = item_by_ref.get(source_ref) {
            library_nodes.insert(
                source_ref.clone(),
                json!({
                    "nodeId":source_ref,
                    "title":item.title,
                    "year":item.year,
                    "authors":item.creators,
                    "aliases":[],
                }),
            );
        }
    }
    let mut references = Vec::new();
    for raw in facts
        .raw
        .iter()
        .filter(|raw| source_set.contains(&raw.source_ref))
    {
        let effective = if raw.canonical_reference_id.is_empty() {
            raw.raw_reference_id.clone()
        } else {
            redirect_graph.resolve(&raw.canonical_reference_id)?
        };
        let binding = binding_by_effective.get(&effective).copied();
        let bound_ref =
            binding.map(|binding| format!("{}:{}", binding.library_id, binding.item_key));
        let target_item = bound_ref
            .as_ref()
            .and_then(|paper_ref| item_by_ref.get(paper_ref));
        let canonical = canonical_by_id.get(effective.as_str()).copied();
        let (target_id, target_kind) =
            if let (Some(paper_ref), Some(item)) = (bound_ref.as_ref(), target_item) {
                library_nodes.entry(paper_ref.clone()).or_insert_with(|| {
                    json!({
                        "nodeId":paper_ref,
                        "title":item.title,
                        "year":item.year,
                        "authors":item.creators,
                        "aliases":[],
                    })
                });
                (paper_ref.clone(), "library_paper")
            } else if raw.canonical_reference_id.is_empty() {
                (effective.clone(), "unresolved_reference")
            } else {
                (effective.clone(), "external_reference")
            };
        let edge_hash = canonical_json_hash(&json!({
            "source":raw.source_ref,
            "reference":raw.raw_reference_id,
            "target":target_id,
        }))?;
        references.push(json!({
            "referenceId":raw.raw_reference_id,
            "edgeId":format!("edge:{}",edge_hash.trim_start_matches("sha256:")),
            "sourceId":raw.source_ref,
            "sourceRef":raw.source_ref,
            "targetId":target_id,
            "targetKind":target_kind,
            "targetTitle":target_item.map(|item|item.title.as_str())
                .or_else(||canonical.map(|row|row.title.as_str()))
                .unwrap_or(raw.parsed_title.as_str()),
            "targetYear":target_item.map(|item|item.year.as_str())
                .or_else(||canonical.map(|row|row.year.as_str()))
                .unwrap_or(raw.year.as_str()),
            "targetAuthors":target_item.map(|item|item.creators.clone())
                .or_else(||canonical.map(|row|parse_authors(&row.authors_json)))
                .unwrap_or_else(||parse_authors(&raw.authors_json)),
            "targetAliases":[],
            "roles":parse_roles(&raw.roles_json),
            "weight":1,
        }));
    }
    if library_nodes.len() > SOURCE_LIMIT || references.len() > REFERENCE_LIMIT {
        return Err("reverse_host_input_too_large".into());
    }
    let target_count = references
        .iter()
        .filter_map(|reference| reference["targetId"].as_str())
        .collect::<HashSet<_>>()
        .len();
    if target_count > TARGET_LIMIT {
        return Err("reverse_host_input_too_large".into());
    }
    Ok(json!({
        "contractVersion":CONTRACT_VERSION,
        "scope":{"kind":kind,"sourceIds":source_refs},
        "rolePriority":[],
        "libraryNodes":library_nodes.into_values().collect::<Vec<_>>(),
        "references":references,
    }))
}

fn run_rebuild(
    apps: &ProductionApplications,
    intent: RebuildIntent,
    requested_source_refs: Option<Vec<String>>,
) -> Result<Value, String> {
    let facts = durable_facts(apps)?;
    let (mut source_refs, kind, collection_refs) = match requested_source_refs {
        Some(source_refs) => {
            let source_refs = source_refs
                .into_iter()
                .map(|value| value.trim().to_owned())
                .filter(|value| !value.is_empty())
                .collect::<BTreeSet<_>>()
                .into_iter()
                .collect::<Vec<_>>();
            (source_refs.clone(), "source_slice", Some(source_refs))
        }
        None if intent == RebuildIntent::Incremental => {
            let redirect_graph = ReferenceRedirectGraph::from_records(&facts.redirects)?;
            let delta = stale_delta(facts.cache_basis.as_ref());
            let source_refs = affected_source_refs(&facts, &delta)?;
            if source_refs.is_empty() || current_graph_hash(apps)?.is_none() {
                (Vec::new(), "full", None)
            } else {
                let mut metadata_refs = source_refs.clone();
                for raw in facts
                    .raw
                    .iter()
                    .filter(|raw| source_refs.binary_search(&raw.source_ref).is_ok())
                {
                    let effective = redirect_graph.resolve(&raw.canonical_reference_id)?;
                    if let Some(binding) = facts.bindings.iter().find(|binding| {
                        redirect_graph
                            .resolve(&binding.canonical_reference_id)
                            .is_ok_and(|candidate| candidate == effective)
                    }) {
                        metadata_refs.push(format!("{}:{}", binding.library_id, binding.item_key));
                    }
                }
                metadata_refs.sort();
                metadata_refs.dedup();
                (source_refs, "source_slice", Some(metadata_refs))
            }
        }
        None => (Vec::new(), "full", None),
    };
    let mode = if kind == "source_slice" {
        CitationGraphRebuildMode::Incremental
    } else {
        CitationGraphRebuildMode::Full
    };
    let attempt = apps.citations.prepare_rebuild(mode)?;
    let items = match collection_refs {
        Some(refs) => collect_items_by_ref(apps.host_items.as_ref(), &refs),
        None => collect_host_items(apps.host_items.as_ref()),
    };
    let items = match items {
        Ok(items) => items,
        Err(error) => {
            let checkpoint = || promotion_checkpoint(apps);
            return apps
                .citations
                .finish_rebuild(attempt, Err(error), &checkpoint)
                .and_then(|_| Err("citation_graph_collection_failed".into()));
        }
    };
    if kind == "full" {
        source_refs = items.iter().map(|item| item.paper_ref.clone()).collect();
    }
    let input = match build_input(&facts, items, &source_refs, kind) {
        Ok(input) => input,
        Err(error) => {
            let checkpoint = || promotion_checkpoint(apps);
            return apps
                .citations
                .finish_rebuild(attempt, Err(error), &checkpoint)
                .and_then(|_| Err("citation_graph_input_failed".into()));
        }
    };
    let checkpoint = || promotion_checkpoint(apps);
    let result = apps.citations.finish_rebuild(
        attempt,
        Ok(CitationGraphRebuildMaterial {
            input,
            source_ids: if mode == CitationGraphRebuildMode::Incremental {
                source_refs.clone()
            } else {
                Vec::new()
            },
        }),
        &checkpoint,
    )?;
    let should_sync = intent == RebuildIntent::Incremental
        && mode == CitationGraphRebuildMode::Incremental
        && matches!(
            result.status,
            CitationMutationStatus::Promoted | CitationMutationStatus::Unchanged
        );
    let graph_hash = result.graph_hash.clone().unwrap_or_default();
    let mut value = wire(result)?;
    if should_sync {
        let summary = apps.related_items.sync(&source_refs, &graph_hash);
        let object = value
            .as_object_mut()
            .ok_or_else(|| "production_projection_invalid".to_owned())?;
        object.insert("affected_source_refs".into(), json!(source_refs));
        object.insert(
            "related_items_sync".into(),
            serde_json::to_value(summary)
                .map_err(|_| "production_projection_invalid".to_owned())?,
        );
    }
    Ok(value)
}

fn start_update(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: PublicUpdateRequest = one_or_default(args)?;
    if request
        .idempotency_key
        .as_ref()
        .is_some_and(|key| key.len() > 200)
        || request
            .expected_reference_basis_hash
            .as_ref()
            .is_some_and(|hash| hash.is_empty())
    {
        return Err("invalid_request".into());
    }
    if let Some(expected) = request.expected_reference_basis_hash.as_deref() {
        let matches = apps.repository.with_reader(|repository| {
            Ok(repository
                .get_cache_basis("reference-sidecar:library")?
                .as_ref()
                .map(|basis| basis.source_hash.as_str())
                == Some(expected))
        })?;
        if !matches {
            return Err("reference_basis_mismatch".into());
        }
    }
    let scope = request
        .scope
        .as_deref()
        .unwrap_or(if request.paper_refs.is_empty() {
            "library"
        } else {
            "papers"
        });
    match scope {
        "library" if request.paper_refs.is_empty() => run_rebuild(apps, RebuildIntent::Full, None),
        "papers" if !request.paper_refs.is_empty() => {
            run_rebuild(apps, RebuildIntent::Incremental, Some(request.paper_refs))
        }
        _ => Err("invalid_request".into()),
    }
}

fn refresh_metrics(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: PublicMetricsRequest = one_or_default(args)?;
    let expected = request
        .expected_graph_hash
        .or(request.graph_hash)
        .or(current_graph_hash(apps)?)
        .ok_or_else(|| "citation_graph_basis_missing".to_owned())?;
    let checkpoint = || promotion_checkpoint(apps);
    wire(
        apps.citations
            .refresh_metrics_with_checkpoint(&expected, &checkpoint),
    )
}

fn recompute_layout(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    let request: PublicLayoutRequest = one(args)?;
    let graph_hash =
        current_graph_hash(apps)?.ok_or_else(|| "citation_graph_basis_missing".to_owned())?;
    let view_key = "workbench_overview".to_owned();
    let layout_key = format!("{view_key}:{}", request.algorithm.as_str());
    if !request.force
        && apps
            .citations
            .read()?
            .layout(&layout_key, &[])?
            .is_some_and(|layout| layout.graph_hash == graph_hash && layout.status == "ready")
    {
        return wire(CitationMutationResult {
            status: CitationMutationStatus::Unchanged,
            graph_hash: Some(graph_hash),
            input_hash: apps.citations.inspect()?.input_hash,
            metrics_hash: apps.citations.inspect()?.metrics_hash,
            warnings: Vec::new(),
        });
    }
    let checkpoint = || promotion_checkpoint(apps);
    wire(apps.citations.recompute_layout_with_checkpoint(
        CitationLayoutRequest {
            expected_graph_hash: graph_hash,
            layout_key,
            view_key,
            preset: request.algorithm.as_str().into(),
        },
        &checkpoint,
    ))
}

fn promotion_checkpoint(apps: &ProductionApplications) -> Result<(), String> {
    checkpoint_current_before_promotion(apps)
}

fn retry(apps: &ProductionApplications, args: &[Value]) -> Result<Value, String> {
    no_args(args)?;
    match apps.citations.latest_failed_rebuild_mode()? {
        Some(CitationGraphRebuildMode::Full) => run_rebuild(apps, RebuildIntent::Full, None),
        Some(CitationGraphRebuildMode::Incremental) => {
            run_rebuild(apps, RebuildIntent::Incremental, None)
        }
        None => {
            let facts = durable_facts(apps)?;
            let status = facts
                .cache_basis
                .as_ref()
                .map(|cache| cache.status.as_str());
            if status == Some("ready") {
                return Err("citation_graph_retry_intent_missing".into());
            }
            if !matches!(status, None | Some("missing" | "failed" | "stale")) {
                return Err("citation_graph_retry_intent_missing".into());
            }
            let delta = stale_delta(facts.cache_basis.as_ref());
            let has_delta = !delta.source_refs.is_empty() || !delta.canonical_ids.is_empty();
            if current_graph_hash(apps)?.is_some() && status == Some("stale") && has_delta {
                run_rebuild(apps, RebuildIntent::Incremental, None)
            } else {
                run_rebuild(apps, RebuildIntent::Full, None)
            }
        }
    }
}

pub(crate) fn dispatch(
    apps: &ProductionApplications,
    capability: &str,
    args: &[Value],
) -> Result<Value, String> {
    match capability {
        "client.startCitationGraphUpdate" => start_update(apps, args),
        "client.refreshCitationGraphMetricsNow" => refresh_metrics(apps, args),
        "client.recomputeCitationGraphLayout" => recompute_layout(apps, args),
        "client.rebuildCitationGraphCacheNow" => {
            no_args(args)?;
            run_rebuild(apps, RebuildIntent::Full, None)
        }
        "client.refreshCitationGraphCacheIncrementalNow" => {
            no_args(args)?;
            run_rebuild(apps, RebuildIntent::Incremental, None)
        }
        "client.retryCitationGraphCacheRebuild" => retry(apps, args),
        _ => Err("operation_unavailable".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::runtime_host_collection::{ReferenceHostItemsByRef, ReferenceHostItemsPage};
    use crate::runtime_production_ports::build_production_applications;
    use crate::runtime_worker_pool::NativeComputePool;
    use std::path::Path;
    use std::sync::{Arc, Mutex};
    use synthesis_canonical_store::{CanonicalIdentity, CanonicalStore};
    use synthesis_repository::{
        CitationEdgeRecord, CitationGraphApplicationStateRecord, CitationGraphReplacement,
        CitationNodeRecord, Repository, RepositoryIdentity,
    };

    struct FakeHost {
        items: Mutex<Vec<ReferenceHostItem>>,
        fail: std::sync::atomic::AtomicBool,
    }

    impl FakeHost {
        fn new(items: Vec<ReferenceHostItem>) -> Self {
            Self {
                items: Mutex::new(items),
                fail: std::sync::atomic::AtomicBool::new(false),
            }
        }
    }

    impl HostItemCollectionPort for FakeHost {
        fn list_items_page(
            &self,
            cursor: &str,
            limit: usize,
        ) -> Result<ReferenceHostItemsPage, String> {
            if self.fail.load(Ordering::Relaxed) {
                return Err("reverse_host_unavailable".into());
            }
            let offset = cursor.parse::<usize>().unwrap_or(0);
            let items = self.items.lock().expect("items");
            let page = items
                .iter()
                .skip(offset)
                .take(limit)
                .cloned()
                .collect::<Vec<_>>();
            let next = offset + page.len();
            let has_more = next < items.len();
            Ok(ReferenceHostItemsPage {
                returned: page.len(),
                items: page,
                cursor: cursor.into(),
                next_cursor: if has_more {
                    next.to_string()
                } else {
                    String::new()
                },
                snapshot_revision: "host-revision:1".into(),
                has_more,
                limit,
            })
        }

        fn get_items_by_ref(
            &self,
            paper_refs: &[String],
        ) -> Result<ReferenceHostItemsByRef, String> {
            if self.fail.load(Ordering::Relaxed) {
                return Err("reverse_host_unavailable".into());
            }
            let requested = paper_refs.iter().cloned().collect::<BTreeSet<_>>();
            let items = self
                .items
                .lock()
                .expect("items")
                .iter()
                .filter(|item| requested.contains(&item.paper_ref))
                .cloned()
                .collect::<Vec<_>>();
            let returned = items
                .iter()
                .map(|item| item.paper_ref.clone())
                .collect::<BTreeSet<_>>();
            Ok(ReferenceHostItemsByRef {
                items,
                missing_paper_refs: requested.difference(&returned).cloned().collect(),
            })
        }
    }

    fn item(paper_ref: &str, title: &str) -> ReferenceHostItem {
        let (_, item_key) = paper_ref.split_once(':').expect("paper ref");
        ReferenceHostItem {
            paper_ref: paper_ref.into(),
            library_id: 1,
            item_key: item_key.into(),
            item_type: "journalArticle".into(),
            title: title.into(),
            year: "2026".into(),
            date: "2026".into(),
            creators: vec!["Author".into()],
            tags: Vec::new(),
            collections: Vec::new(),
            doi: String::new(),
            arxiv: String::new(),
            isbn: String::new(),
            url: String::new(),
            citekey: String::new(),
            date_added: "1".into(),
            updated_at: "1".into(),
            metadata_hash: format!("sha256:{item_key}"),
        }
    }

    fn root() -> synthesis_test_support::TestRoot {
        synthesis_test_support::TestRoot::new("synthesis-citation-command")
    }

    fn applications(root: &Path, host: Arc<FakeHost>) -> ProductionApplications {
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
        let mut apps = build_production_applications(
            Arc::new(synthesis_application::RepositoryPort::new(Arc::new(
                Mutex::new(repository),
            ))),
            Arc::new(Mutex::new(canonical)),
            Arc::new(NativeComputePool::new()),
            None,
            "service".into(),
            root.join("webdav-state.json"),
        )
        .expect("applications");
        apps.host_items = host;
        apps
    }

    #[test]
    fn full_commands_build_refresh_and_layout_from_public_dtos() {
        let root = root();
        let host = Arc::new(FakeHost::new(vec![
            item("1:AAAA1111", "Paper A"),
            item("1:BBBB2222", "Paper B"),
        ]));
        let apps = applications(&root, host);
        let rebuilt =
            dispatch(&apps, "client.rebuildCitationGraphCacheNow", &[]).expect("full rebuild");
        assert_eq!(rebuilt["status"], "promoted");
        assert_eq!(apps.citations.inspect().expect("inspect").node_count, 2);
        let metrics = dispatch(&apps, "client.refreshCitationGraphMetricsNow", &[json!({})])
            .expect("metrics");
        assert_eq!(metrics["status"], "promoted");
        let layout = dispatch(
            &apps,
            "client.recomputeCitationGraphLayout",
            &[json!({"algorithm":"radial","force":true})],
        )
        .expect("layout");
        assert_eq!(layout["status"], "promoted");
        let persisted = apps
            .citations
            .read()
            .expect("read view")
            .layout("workbench_overview:radial", &[])
            .expect("layout read")
            .expect("persisted layout");
        assert_eq!(persisted.view_key, "workbench_overview");
        assert_eq!(persisted.preset, "radial");
        drop(apps);
    }

    #[test]
    fn layout_promotes_shared_external_node_without_a_year() {
        let root = root();
        let apps = applications(&root, Arc::new(FakeHost::new(Vec::new())));
        let graph_hash = format!("sha256:{}", "a".repeat(64));
        let node = |id: &str, library: bool, title: &str, year: &str| CitationNodeRecord {
            literature_item_id: id.into(),
            node_status: "active".into(),
            has_zotero_binding: library,
            title: title.into(),
            year: year.into(),
            summary_json: serde_json::json!({
                "kind":if library {"library_paper"} else {"external_reference"},
            })
            .to_string(),
            ..CitationNodeRecord::default()
        };
        let edge = |id: &str, source: &str| CitationEdgeRecord {
            edge_id: id.into(),
            source_literature_item_id: source.into(),
            target_literature_item_id: "external:shared".into(),
            edge_status: "unbound".into(),
            ..CitationEdgeRecord::default()
        };
        assert!(
            apps.repository
                .owner()
                .lock()
                .expect("repository")
                .replace_citation_graph_application_state(
                    None,
                    &CitationGraphReplacement {
                        state: CitationGraphApplicationStateRecord {
                            graph_hash: graph_hash.clone(),
                            input_hash: format!("sha256:{}", "b".repeat(64)),
                            node_count: 3,
                            edge_count: 2,
                            updated_at: now_string(),
                            ..CitationGraphApplicationStateRecord::default()
                        },
                        nodes: vec![
                            node("1:AAAA1111", true, "Paper A", "2024"),
                            node("1:BBBB2222", true, "Paper B", "2025"),
                            node("external:shared", false, " Shared external ", ""),
                        ],
                        edges: vec![
                            edge("edge:a-shared", "1:AAAA1111"),
                            edge("edge:b-shared", "1:BBBB2222"),
                        ],
                        ownership: Vec::new(),
                        incoming_groups: Vec::new(),
                        light_metrics: Vec::new(),
                        complex_metrics: Vec::new(),
                    },
                )
                .expect("replace graph")
        );

        let result = dispatch(
            &apps,
            "client.recomputeCitationGraphLayout",
            &[json!({"algorithm":"radial","force":true})],
        )
        .expect("layout mutation");
        assert_eq!(result["status"], "promoted");
        let persisted = apps
            .citations
            .read()
            .expect("read view")
            .layout(
                "workbench_overview:radial",
                &[
                    "1:AAAA1111".into(),
                    "1:BBBB2222".into(),
                    "external:shared".into(),
                ],
            )
            .expect("layout read")
            .expect("persisted layout");
        assert_eq!(persisted.points.len(), 3);
        assert!(
            persisted
                .points
                .iter()
                .all(|point| point.x.is_finite() && point.y.is_finite())
        );
        assert_eq!(persisted.graph_hash, graph_hash);
        drop(apps);
    }

    #[test]
    fn incremental_refresh_preserves_unrelated_sources_and_retry_restores_intent() {
        let root = root();
        let host = Arc::new(FakeHost::new(vec![
            item("1:AAAA1111", "Paper A"),
            item("1:BBBB2222", "Paper B"),
        ]));
        let apps = applications(&root, host.clone());
        dispatch(&apps, "client.rebuildCitationGraphCacheNow", &[]).expect("full rebuild");
        {
            let owner = apps.repository.owner();
            let repository = owner.lock().expect("repository");
            repository
                .upsert_cache_basis(&CacheBasisRecord {
                    cache_key: CACHE_KEY.into(),
                    cache_kind: "citation_graph".into(),
                    scope_kind: "library".into(),
                    status: "stale".into(),
                    diagnostics_json: serde_json::to_string(&vec![json!({
                        "code":"citation_graph_cache_stale_delta",
                        "source_refs":["1:AAAA1111"],
                    })])
                    .expect("diagnostics"),
                    updated_at: now_string(),
                    ..CacheBasisRecord::default()
                })
                .expect("stale");
        }
        let incremental = dispatch(&apps, "client.refreshCitationGraphCacheIncrementalNow", &[])
            .expect("incremental");
        assert_eq!(incremental["status"], "promoted");
        let page = apps
            .citations
            .read()
            .expect("read view")
            .first_page(
                synthesis_application::citation_graph::CitationGraphPageRequest {
                    node_limit: 10,
                    edge_limit: 10,
                    hover_node_limit: 10,
                    hover_edge_limit: 10,
                    ..synthesis_application::citation_graph::CitationGraphPageRequest::default()
                },
            )
            .expect("graph page");
        let node_ids = page
            .nodes
            .into_iter()
            .filter(|node| node.has_zotero_binding)
            .map(|node| node.node_id)
            .collect::<Vec<_>>();
        assert_eq!(node_ids, vec!["1:AAAA1111", "1:BBBB2222"]);

        let last_good = current_graph_hash(&apps).expect("graph hash");
        host.fail.store(true, Ordering::Relaxed);
        assert_eq!(
            dispatch(&apps, "client.rebuildCitationGraphCacheNow", &[]),
            Err("reverse_host_unavailable".into()),
        );
        assert_eq!(current_graph_hash(&apps).expect("graph hash"), last_good);
        assert_eq!(
            apps.citations
                .read()
                .expect("read view")
                .first_page(
                    synthesis_application::citation_graph::CitationGraphPageRequest::default()
                )
                .expect("graph page")
                .cache_status,
            "ready",
        );
        drop(apps);
        host.fail.store(false, Ordering::Relaxed);
        let reopened = applications(&root, host);
        let retried =
            dispatch(&reopened, "client.retryCitationGraphCacheRebuild", &[]).expect("retry");
        assert_eq!(retried["status"], "promoted");
        drop(reopened);
    }

    #[test]
    fn empty_and_missing_delta_rebuilds_remain_explicit_full_jobs() {
        let empty_root = root();
        let empty = applications(&empty_root, Arc::new(FakeHost::new(Vec::new())));
        let result =
            dispatch(&empty, "client.rebuildCitationGraphCacheNow", &[]).expect("empty rebuild");
        assert_eq!(result["status"], "promoted");
        assert_eq!(empty.citations.inspect().expect("inspect").node_count, 0);
        drop(empty);
        let _ = std::fs::remove_dir_all(empty_root);

        let root = root();
        let host = Arc::new(FakeHost::new(vec![item("1:AAAA1111", "Paper A")]));
        let apps = applications(&root, host);
        dispatch(&apps, "client.rebuildCitationGraphCacheNow", &[]).expect("full");
        {
            let owner = apps.repository.owner();
            let repository = owner.lock().expect("repository");
            let mut basis = repository
                .get_cache_basis(CACHE_KEY)
                .expect("cache")
                .expect("basis");
            basis.status = "stale".into();
            basis.diagnostics_json = "[]".into();
            repository.upsert_cache_basis(&basis).expect("stale");
        }
        let fallback = dispatch(&apps, "client.refreshCitationGraphCacheIncrementalNow", &[])
            .expect("full fallback");
        assert_eq!(fallback["status"], "promoted");
        assert!(fallback.get("affected_source_refs").is_none());
        drop(apps);
    }

    #[test]
    fn incremental_retry_reopens_the_latest_incremental_intent() {
        let root = root();
        let host = Arc::new(FakeHost::new(vec![
            item("1:AAAA1111", "Paper A"),
            item("1:BBBB2222", "Paper B"),
        ]));
        let apps = applications(&root, host.clone());
        dispatch(&apps, "client.rebuildCitationGraphCacheNow", &[]).expect("full");
        {
            let owner = apps.repository.owner();
            let repository = owner.lock().expect("repository");
            let mut basis = repository
                .get_cache_basis(CACHE_KEY)
                .expect("cache")
                .expect("basis");
            basis.status = "stale".into();
            basis.diagnostics_json = serde_json::to_string(&vec![json!({
                "code":"citation_graph_cache_stale_delta",
                "source_refs":["1:AAAA1111"],
            })])
            .expect("diagnostics");
            repository.upsert_cache_basis(&basis).expect("stale");
        }
        host.fail.store(true, Ordering::Relaxed);
        assert_eq!(
            dispatch(&apps, "client.refreshCitationGraphCacheIncrementalNow", &[],),
            Err("reverse_host_unavailable".into()),
        );
        drop(apps);

        host.fail.store(false, Ordering::Relaxed);
        let reopened = applications(&root, host);
        let retried =
            dispatch(&reopened, "client.retryCitationGraphCacheRebuild", &[]).expect("retry");
        assert_eq!(retried["status"], "promoted");
        assert!(retried["affected_source_refs"].is_array());
        drop(reopened);
    }
}
