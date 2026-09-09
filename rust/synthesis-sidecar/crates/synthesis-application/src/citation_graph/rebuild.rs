use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::Arc;
use std::sync::atomic::AtomicBool;

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CitationGraphRebuildMode {
    Full,
    Incremental,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphCollectionPlan {
    pub mode: CitationGraphRebuildMode,
    pub expected_graph_hash: Option<String>,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct CitationGraphRebuildMaterial {
    pub input: Value,
    #[serde(default)]
    pub source_ids: Vec<String>,
}

/// Opaque rebuild attempt returned by `prepare_rebuild`.
///
/// Creating an attempt reserves the graph rebuild admission slot and persists a
/// running operation receipt, so the attempt must be handed to
/// `finish_rebuild`, which converges it on success, collection failure, compute
/// failure, cancellation, or basis mismatch. Dropping an attempt without
/// finishing it leaks the admission slot and leaves a stale running receipt;
/// `Drop` cannot release them because the attempt deliberately holds no
/// reference back to the owning application.
#[must_use = "a rebuild attempt holds the admission slot and a running receipt until finish_rebuild consumes it"]
pub struct CitationGraphRebuildAttempt {
    pub(super) operation_id: String,
    pub(super) started_at: String,
    pub(super) plan: CitationGraphCollectionPlan,
    pub(super) cancel: Arc<AtomicBool>,
}

impl CitationGraphRebuildAttempt {
    pub fn plan(&self) -> &CitationGraphCollectionPlan {
        &self.plan
    }
}
