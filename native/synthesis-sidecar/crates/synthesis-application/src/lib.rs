use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::sync::{Arc, Mutex};
use synthesis_canonical_store::{CanonicalReceipt, CanonicalStore, Promotion};
use synthesis_protocol::canonical_json;
use synthesis_repository::{ApplicationState, OperationRecord, Repository};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ApplicationKind {
    Workbench,
    Topic,
    CitationGraph,
    ReferenceRefresh,
    ReferenceMatchingReview,
    TagVocabulary,
    ConceptKb,
    TopicGraph,
    KnowledgeCheckpoint,
    DurableBundleExport,
    DurableBundleImport,
    Webdav,
    DebugMaintenance,
}

impl ApplicationKind {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Workbench => "workbench",
            Self::Topic => "topic",
            Self::CitationGraph => "citation_graph",
            Self::ReferenceRefresh => "reference_refresh",
            Self::ReferenceMatchingReview => "reference_matching_review",
            Self::TagVocabulary => "tag_vocabulary",
            Self::ConceptKb => "concept_kb",
            Self::TopicGraph => "topic_graph",
            Self::KnowledgeCheckpoint => "knowledge_checkpoint",
            Self::DurableBundleExport => "durable_bundle_export",
            Self::DurableBundleImport => "durable_bundle_import",
            Self::Webdav => "webdav",
            Self::DebugMaintenance => "debug_maintenance",
        }
    }

    fn allows(self, operation: &str) -> bool {
        match self {
            Self::Workbench => matches!(operation, "chrome_read" | "prewarm"),
            Self::Topic => matches!(operation, "create" | "patch" | "list" | "read"),
            Self::CitationGraph => {
                matches!(operation, "rebuild" | "metrics" | "layout" | "read")
            }
            Self::ReferenceRefresh => matches!(operation, "prepare" | "apply" | "read"),
            Self::ReferenceMatchingReview => {
                matches!(
                    operation,
                    "prepare" | "match" | "review" | "discard" | "read"
                )
            }
            Self::TagVocabulary => matches!(
                operation,
                "replace" | "stage" | "promote" | "index" | "audit" | "read"
            ),
            Self::ConceptKb => matches!(
                operation,
                "create" | "merge" | "review" | "delete" | "index" | "query" | "read"
            ),
            Self::TopicGraph => matches!(
                operation,
                "propose" | "review" | "delete" | "purge" | "index" | "read"
            ),
            Self::KnowledgeCheckpoint => {
                matches!(operation, "capture" | "preview" | "apply" | "read")
            }
            Self::DurableBundleExport => matches!(operation, "capture" | "export" | "verify"),
            Self::DurableBundleImport => {
                matches!(operation, "preview" | "apply" | "acknowledge")
            }
            Self::Webdav => matches!(operation, "pull" | "push" | "status"),
            Self::DebugMaintenance => {
                matches!(operation, "snapshot" | "diff" | "maintenance" | "profile")
            }
        }
    }
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ComputeRequest {
    pub operation: String,
    pub payload: Value,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct RemoteEffect {
    pub effect: String,
    pub payload: Value,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ApplicationCommand {
    pub request_id: String,
    pub kind: ApplicationKind,
    pub operation: String,
    #[serde(default)]
    pub expected_basis: Option<String>,
    pub payload: Value,
    #[serde(default)]
    pub compute: Option<ComputeRequest>,
    #[serde(default)]
    pub canonical: Option<Promotion>,
    #[serde(default)]
    pub remote_effects: Vec<RemoteEffect>,
    pub now: String,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ApplicationResult {
    pub request_id: String,
    pub kind: ApplicationKind,
    pub operation: String,
    pub basis: String,
    pub payload: Value,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub compute: Option<Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub canonical_receipt: Option<CanonicalReceipt>,
    #[serde(default)]
    pub effects: Vec<Value>,
    #[serde(default)]
    pub warnings: Vec<String>,
}

pub trait ComputePort: Send + Sync {
    fn execute(&self, operation: &str, payload: Value) -> Result<Value, String>;
}

pub trait RemoteEffectPort: Send + Sync {
    fn execute(&self, effect: &str, payload: Value) -> Result<Value, String>;
}

#[derive(Debug)]
pub struct DisabledCompute;

impl ComputePort for DisabledCompute {
    fn execute(&self, _operation: &str, _payload: Value) -> Result<Value, String> {
        Err("compute_unavailable".into())
    }
}

#[derive(Debug)]
pub struct DisabledRemoteEffects;

impl RemoteEffectPort for DisabledRemoteEffects {
    fn execute(&self, _effect: &str, _payload: Value) -> Result<Value, String> {
        Err("remote_effect_unavailable".into())
    }
}

pub struct Application {
    repository: Arc<Mutex<Repository>>,
    canonical: Arc<Mutex<CanonicalStore>>,
    compute: Arc<dyn ComputePort>,
    remote_effects: Arc<dyn RemoteEffectPort>,
    mutation_gate: Mutex<()>,
}

pub fn application_inventory() -> &'static [ApplicationKind] {
    &[
        ApplicationKind::Workbench,
        ApplicationKind::Topic,
        ApplicationKind::CitationGraph,
        ApplicationKind::ReferenceRefresh,
        ApplicationKind::ReferenceMatchingReview,
        ApplicationKind::TagVocabulary,
        ApplicationKind::ConceptKb,
        ApplicationKind::TopicGraph,
        ApplicationKind::KnowledgeCheckpoint,
        ApplicationKind::DurableBundleExport,
        ApplicationKind::DurableBundleImport,
        ApplicationKind::Webdav,
        ApplicationKind::DebugMaintenance,
    ]
}

fn validate_text(value: &str, max: usize) -> Result<(), String> {
    if value.is_empty() || value.len() > max || value.chars().any(|value| value.is_control()) {
        return Err("application_request_invalid".into());
    }
    Ok(())
}

fn stable_hash(value: &Value) -> Result<String, String> {
    let canonical = canonical_json(value).map_err(|_| "application_payload_invalid".to_owned())?;
    let mut hash = Sha256::new();
    hash.update(canonical.as_bytes());
    Ok(format!("{:x}", hash.finalize()))
}

impl Application {
    pub fn new(
        repository: Arc<Mutex<Repository>>,
        canonical: Arc<Mutex<CanonicalStore>>,
        compute: Arc<dyn ComputePort>,
        remote_effects: Arc<dyn RemoteEffectPort>,
    ) -> Self {
        Self {
            repository,
            canonical,
            compute,
            remote_effects,
            mutation_gate: Mutex::new(()),
        }
    }

    pub fn repository(&self) -> Arc<Mutex<Repository>> {
        Arc::clone(&self.repository)
    }

    pub fn canonical(&self) -> Arc<Mutex<CanonicalStore>> {
        Arc::clone(&self.canonical)
    }

    pub fn workbench_chrome_read(&self) -> Result<Value, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .workbench_chrome()
    }

    pub fn canonical_inspect(&self, topic_id: &str) -> Result<Value, String> {
        validate_text(topic_id, 512)?;
        self.canonical
            .lock()
            .map_err(|_| "canonical_store_unavailable".to_owned())?
            .inspect(topic_id)
    }

    pub fn read_state(&self, kind: ApplicationKind) -> Result<Option<ApplicationState>, String> {
        self.repository
            .lock()
            .map_err(|_| "repository_unavailable".to_owned())?
            .application_state(kind.as_str())
    }

    pub fn execute(&self, command: ApplicationCommand) -> Result<ApplicationResult, String> {
        validate_text(&command.request_id, 512)?;
        validate_text(&command.operation, 128)?;
        validate_text(&command.now, 128)?;
        if !command.kind.allows(&command.operation) {
            return Err("application_operation_invalid".into());
        }
        canonical_json(&command.payload).map_err(|_| "application_payload_invalid".to_owned())?;
        let _admission = self
            .mutation_gate
            .try_lock()
            .map_err(|_| "application_busy".to_owned())?;

        {
            let repository = self
                .repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            let current = repository.application_state(command.kind.as_str())?;
            if current.as_ref().map(|state| state.basis.as_str())
                != command.expected_basis.as_deref()
            {
                return Err("basis_mismatch".into());
            }
        }

        let compute = command
            .compute
            .as_ref()
            .map(|request| {
                validate_text(&request.operation, 128)?;
                self.compute
                    .execute(&request.operation, request.payload.clone())
                    .map_err(|code| {
                        if code.is_empty() {
                            "compute_failed".into()
                        } else {
                            code
                        }
                    })
            })
            .transpose()?;

        let canonical_receipt = command
            .canonical
            .clone()
            .map(|promotion| {
                self.canonical
                    .lock()
                    .map_err(|_| "canonical_store_unavailable".to_owned())?
                    .promote(promotion)
            })
            .transpose()?;

        let payload = json!({
            "input": command.payload,
            "compute": compute,
            "canonicalReceipt": canonical_receipt,
        });
        let basis = stable_hash(&payload)?;
        {
            let mut repository = self
                .repository
                .lock()
                .map_err(|_| "repository_unavailable".to_owned())?;
            if !repository.compare_and_swap_application_state(
                ApplicationState {
                    kind: command.kind.as_str().into(),
                    basis: basis.clone(),
                    payload: payload.clone(),
                    updated_at: command.now.clone(),
                },
                command.expected_basis.as_deref(),
            )? {
                return Err("basis_mismatch".into());
            }
            repository.upsert_operation(&OperationRecord {
                operation_id: command.request_id.clone(),
                operation_type: command.kind.as_str().into(),
                library_id: 0,
                status: "succeeded".into(),
                label: command.operation.clone(),
                phase: "committed".into(),
                message: String::new(),
                created_at: command.now.clone(),
                updated_at: command.now.clone(),
            })?;
        }

        let mut effects = Vec::new();
        let mut warnings = Vec::new();
        for effect in command.remote_effects {
            validate_text(&effect.effect, 128)?;
            match self.remote_effects.execute(&effect.effect, effect.payload) {
                Ok(result) => effects.push(result),
                Err(code) => warnings.push(if code.is_empty() {
                    "remote_effect_failed".into()
                } else {
                    code
                }),
            }
        }
        Ok(ApplicationResult {
            request_id: command.request_id,
            kind: command.kind,
            operation: command.operation,
            basis,
            payload,
            compute,
            canonical_receipt,
            effects,
            warnings,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::BTreeMap;
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};
    use synthesis_canonical_store::{CanonicalIdentity, TopicSnapshot, canonical_json_hash};
    use synthesis_repository::RepositoryIdentity;

    struct EchoCompute;
    impl ComputePort for EchoCompute {
        fn execute(&self, operation: &str, payload: Value) -> Result<Value, String> {
            Ok(json!({"operation":operation,"payload":payload}))
        }
    }

    struct FailingRemote;
    impl RemoteEffectPort for FailingRemote {
        fn execute(&self, _effect: &str, _payload: Value) -> Result<Value, String> {
            Err("host_effect_failed".into())
        }
    }

    fn root(label: &str) -> PathBuf {
        let root = std::env::temp_dir().join(format!(
            "synthesis-r7-application-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        fs::create_dir_all(&root).expect("root");
        root
    }

    fn application(root: &std::path::Path) -> Application {
        let repository = Repository::open(
            root,
            RepositoryIdentity {
                profile_id: "profile:r7".into(),
                data_root_id: "data:r7".into(),
            },
        )
        .expect("repository");
        let canonical = CanonicalStore::open(
            root,
            CanonicalIdentity {
                profile_id: "profile:r7".into(),
                data_root_id: "data:r7".into(),
            },
        )
        .expect("canonical");
        Application::new(
            Arc::new(Mutex::new(repository)),
            Arc::new(Mutex::new(canonical)),
            Arc::new(EchoCompute),
            Arc::new(FailingRemote),
        )
    }

    #[test]
    fn application_inventory_matches_the_shared_corpus() {
        let corpus: Value = serde_json::from_str(include_str!(
            "../../../../../packages/synthesis-contracts/contract-set/synthesis-durable-foundation-v1/corpus.json"
        ))
        .expect("shared corpus");
        let actual = application_inventory()
            .iter()
            .map(|kind| kind.as_str())
            .collect::<Vec<_>>();
        let expected = corpus["applications"]
            .as_array()
            .expect("applications")
            .iter()
            .map(|entry| entry["kind"].as_str().expect("kind"))
            .collect::<Vec<_>>();
        assert_eq!(actual, expected);
    }

    fn command(kind: ApplicationKind, index: usize) -> ApplicationCommand {
        let topic_sections = BTreeMap::from([("summary".into(), json!({"title":"R7"}))]);
        let topic_artifact = json!({"title":"R7"});
        let topic_metadata = json!({"updatedAt":"2026-01-01"});
        ApplicationCommand {
            request_id: format!("request:{index}"),
            kind,
            operation: match kind {
                ApplicationKind::Workbench => "prewarm",
                ApplicationKind::Topic => "create",
                ApplicationKind::CitationGraph => "rebuild",
                ApplicationKind::ReferenceRefresh => "prepare",
                ApplicationKind::ReferenceMatchingReview => "match",
                ApplicationKind::TagVocabulary => "replace",
                ApplicationKind::ConceptKb => "create",
                ApplicationKind::TopicGraph => "propose",
                ApplicationKind::KnowledgeCheckpoint => "capture",
                ApplicationKind::DurableBundleExport => "export",
                ApplicationKind::DurableBundleImport => "preview",
                ApplicationKind::Webdav => "push",
                ApplicationKind::DebugMaintenance => "snapshot",
            }
            .into(),
            expected_basis: None,
            payload: json!({"fixture":index}),
            compute: Some(ComputeRequest {
                operation: "fixture.compute".into(),
                payload: json!({"index":index}),
            }),
            canonical: if kind == ApplicationKind::Topic {
                Some(Promotion {
                    transaction_id: format!("transaction:{index}"),
                    expected_basis: None,
                    snapshot: TopicSnapshot {
                        topic_id: format!("topic:{index}"),
                        path_id: format!("topic-{index}"),
                        manifest: json!({
                            "topic":index,
                            "sections":{"summary":{"path":"summary.json"}},
                            "artifact_hash":canonical_json_hash(&topic_artifact).expect("artifact hash"),
                            "metadata_hash":canonical_json_hash(&topic_metadata).expect("metadata hash"),
                            "section_hashes":{
                                "summary":canonical_json_hash(&topic_sections["summary"]).expect("section hash")
                            }
                        }),
                        artifact: topic_artifact,
                        metadata: topic_metadata,
                        sections: topic_sections,
                        markdown: BTreeMap::from([("synthesis.md".into(), "# R7\n".into())]),
                    },
                })
            } else {
                None
            },
            remote_effects: if kind == ApplicationKind::Webdav {
                vec![RemoteEffect {
                    effect: "webdav.put".into(),
                    payload: json!({"path":"snapshot.json"}),
                }]
            } else {
                vec![]
            },
            now: "2026-01-01T00:00:00.000Z".into(),
        }
    }

    #[test]
    fn inventory_covers_every_private_application_family() {
        assert_eq!(application_inventory().len(), 13);
        assert!(application_inventory().contains(&ApplicationKind::Workbench));
        assert!(application_inventory().contains(&ApplicationKind::DebugMaintenance));
    }

    #[test]
    fn all_application_families_commit_durable_state_through_ports() {
        let root = root("parity");
        let application = application(&root);
        for (index, kind) in application_inventory().iter().copied().enumerate() {
            let result = application
                .execute(command(kind, index))
                .unwrap_or_else(|error| panic!("{kind:?}: {error}"));
            assert_eq!(result.kind, kind);
            assert!(application.read_state(kind).expect("state").is_some());
            if kind == ApplicationKind::Webdav {
                assert_eq!(result.warnings, vec!["host_effect_failed"]);
            }
        }
        assert_eq!(
            application.canonical_inspect("topic:1").expect("canonical")["status"],
            "ready"
        );
        drop(application);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn stale_basis_performs_zero_writes() {
        let root = root("basis");
        let application = application(&root);
        let first = application
            .execute(command(ApplicationKind::ConceptKb, 1))
            .expect("first");
        let mut stale = command(ApplicationKind::ConceptKb, 2);
        stale.expected_basis = Some("stale".into());
        assert_eq!(application.execute(stale).unwrap_err(), "basis_mismatch");
        assert_eq!(
            application
                .read_state(ApplicationKind::ConceptKb)
                .expect("state")
                .expect("present")
                .basis,
            first.basis
        );
        drop(application);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn every_family_rejects_unknown_operations_without_durable_writes() {
        let root = root("stable-errors");
        let application = application(&root);
        for (index, kind) in application_inventory().iter().copied().enumerate() {
            let mut invalid = command(kind, index);
            invalid.operation = "unknown".into();
            assert_eq!(
                application.execute(invalid).unwrap_err(),
                "application_operation_invalid",
                "{kind:?}"
            );
            assert!(
                application.read_state(kind).expect("state").is_none(),
                "{kind:?}"
            );
        }
        drop(application);
        fs::remove_dir_all(root).expect("cleanup");
    }

    #[test]
    fn every_family_reopens_with_the_same_sorted_durable_state() {
        let root = root("restart");
        let owner = application(&root);
        for (index, kind) in application_inventory().iter().copied().enumerate() {
            owner
                .execute(command(kind, index))
                .unwrap_or_else(|error| panic!("{kind:?}: {error}"));
        }
        let repository = owner.repository();
        let expected = repository
            .lock()
            .expect("repository")
            .table_snapshot()
            .expect("snapshot");
        drop(repository);
        drop(owner);

        let reopened = application(&root);
        for kind in application_inventory().iter().copied() {
            assert!(
                reopened.read_state(kind).expect("state").is_some(),
                "{kind:?}"
            );
        }
        let repository = reopened.repository();
        let actual = repository
            .lock()
            .expect("repository")
            .table_snapshot()
            .expect("snapshot");
        assert_eq!(actual, expected);
        drop(repository);
        drop(reopened);
        fs::remove_dir_all(root).expect("cleanup");
    }
}
