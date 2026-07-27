use serde_json::Value;
use std::sync::{Arc, Mutex};
use synthesis_application::{
    CanonicalStorePort, RepositoryPort, TopicApplication, WorkbenchApplication,
};
use synthesis_canonical_store::CanonicalStore;
use synthesis_repository::Repository;
use synthesis_sidecar::runtime_contract::ProductionAdmission;

use crate::runtime_reverse_host::call_reverse_host;
use crate::runtime_worker_pool::NativeComputePool;

pub(crate) struct ProductionApplications {
    pub(crate) repository: Arc<RepositoryPort>,
    pub(crate) canonical: Arc<CanonicalStorePort>,
    pub(crate) workbench: WorkbenchApplication,
    pub(crate) topics: TopicApplication,
    admission: Option<Arc<ProductionAdmission>>,
    service_instance_id: String,
}

impl ProductionApplications {
    pub(crate) fn call_host(&self, capability: &str, payload: Value) -> Result<Value, String> {
        let admission = self
            .admission
            .as_deref()
            .ok_or_else(|| "reverse_host_unavailable".to_owned())?;
        call_reverse_host(admission, &self.service_instance_id, capability, payload)
    }
}

pub(crate) fn build_production_applications(
    repository: Arc<Mutex<Repository>>,
    canonical: Arc<Mutex<CanonicalStore>>,
    compute: Arc<NativeComputePool>,
    admission: Option<Arc<ProductionAdmission>>,
    service_instance_id: String,
) -> ProductionApplications {
    let repository = Arc::new(RepositoryPort::new(repository));
    let canonical = Arc::new(CanonicalStorePort::new(canonical));
    let workbench = WorkbenchApplication::new(repository.clone());
    let topics = TopicApplication::new(
        repository.clone(),
        canonical.clone(),
        Arc::new(NativeStructuredArtifactPort {
            compute: Arc::clone(&compute),
        }),
    );
    ProductionApplications {
        repository,
        canonical,
        workbench,
        topics,
        admission,
        service_instance_id,
    }
}

struct NativeStructuredArtifactPort {
    compute: Arc<NativeComputePool>,
}

impl synthesis_application::StructuredArtifactPort for NativeStructuredArtifactPort {
    fn validate_manifest(&self, manifest: &Value) -> Result<(), String> {
        self.compute
            .run_direct(
                crate::runtime_worker_pool::WorkerOperation::TopicManifestValidate,
                serde_json::json!({
                    "contractVersion":"synthesis-topic-structured-artifact.v1",
                    "algorithmVersion":"topic-structured-artifact.v1",
                    "manifest":manifest,
                }),
            )
            .and_then(|result| {
                if result.get("ok").and_then(Value::as_bool) == Some(true) {
                    Ok(())
                } else {
                    Err("invalid_request".into())
                }
            })
    }

    fn assemble_artifact(
        &self,
        manifest: &Value,
        sections: &std::collections::BTreeMap<String, Value>,
    ) -> Result<Value, String> {
        self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TopicArtifactAssemble,
            serde_json::json!({
                "contractVersion":"synthesis-topic-structured-artifact.v1",
                "algorithmVersion":"topic-structured-artifact.v1",
                "manifest":manifest,
                "sections":sections,
            }),
        )
    }

    fn validate_artifact(&self, artifact: &Value, language: &str) -> Result<(), String> {
        self.compute
            .run_direct(
                crate::runtime_worker_pool::WorkerOperation::TopicArtifactValidate,
                serde_json::json!({
                    "contractVersion":"synthesis-topic-structured-artifact.v1",
                    "algorithmVersion":"topic-structured-artifact.v1",
                    "expectedLanguage":language,
                    "artifact":artifact,
                }),
            )
            .and_then(|result| {
                if result.get("ok").and_then(Value::as_bool) == Some(true) {
                    Ok(())
                } else {
                    Err("invalid_request".into())
                }
            })
    }

    fn apply_section_patch(
        &self,
        current: &synthesis_canonical_store::TopicSnapshot,
        patch_manifest: &Value,
        changed_sections: &std::collections::BTreeMap<String, Value>,
    ) -> Result<synthesis_application::PatchOutput, String> {
        let result = self.compute.run_direct(
            crate::runtime_worker_pool::WorkerOperation::TopicSectionPatch,
            serde_json::json!({
                "contractVersion":"synthesis-topic-structured-artifact.v1",
                "algorithmVersion":"topic-structured-artifact.v1",
                "current":current,
                "patchManifest":patch_manifest,
                "changedSections":changed_sections,
            }),
        )?;
        let object = result
            .as_object()
            .ok_or_else(|| "worker_result_invalid".to_owned())?;
        let sections = serde_json::from_value(
            object
                .get("sections")
                .cloned()
                .ok_or_else(|| "worker_result_invalid".to_owned())?,
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        let mismatches = serde_json::from_value(
            object
                .get("mismatches")
                .cloned()
                .unwrap_or_else(|| Value::Array(Vec::new())),
        )
        .map_err(|_| "worker_result_invalid".to_owned())?;
        Ok(synthesis_application::PatchOutput {
            sections,
            mismatches,
        })
    }
}
