use crate::runtime_worker_pool::{
    PagedInputFrame, PagedInputSource, PagedOutputFrame, PagedOutputSink,
};
use serde_json::{Map, Value, json};
use std::collections::{BTreeMap, HashMap};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use synthesis_protocol::{
    CITATION_GRAPH_BUILD_TRANSFER_OPERATION, PageDescriptor, canonical_json, canonical_sha256,
    paged_request_hash,
};

const TRANSFER_VERSION: &str = "synthesis-citation-graph-build-transfer.v1";
const TRANSFER_ENCODING: &str = "canonical_json_rows.v1";
const CONTENT_TRANSFER_VERSION: &str = "synthesis-production-content-transfer.v1";
const CONTENT_TRANSFER_ENCODING: &str = "canonical_json_text_chunks.v1";
const MAX_SESSIONS: usize = 2;
const MAX_PAGE_BYTES: u64 = 4 * 1024 * 1024;
const MAX_DIRECTION_BYTES: u64 = 1024 * 1024 * 1024;
const MAX_SERVICE_BYTES: u64 = 2 * 1024 * 1024 * 1024;
const CONTENT_CHUNK_TARGET_BYTES: usize = 48 * 1024;
const IDLE_TTL_MS: u64 = 5 * 60 * 1000;
const ABSOLUTE_TTL_MS: u64 = 30 * 60 * 1000;

#[derive(Clone)]
struct StagedPage {
    path: PathBuf,
    byte_length: u64,
}

struct Session {
    id: String,
    idempotency_key: String,
    root: PathBuf,
    manifest: Value,
    pages: BTreeMap<(String, u64), StagedPage>,
    state: &'static str,
    staged_bytes: u64,
    created_at_ms: u64,
    last_activity_at_ms: u64,
    attempts: u64,
    active_attempt: Option<u64>,
    last_failure: Option<Value>,
    output_manifest: Option<Value>,
    output_pages: BTreeMap<(String, u64), StagedPage>,
    canceled: Arc<AtomicBool>,
}

pub(crate) struct NativeTransferOwner {
    root: PathBuf,
    sessions: HashMap<String, Session>,
    idempotency: HashMap<String, String>,
    next_id: u64,
    stopping: bool,
    service_bytes: Arc<AtomicU64>,
}

pub(crate) enum TransferDispatch {
    Response(Value),
    Execute(Box<TransferExecution>),
}

pub(crate) struct TransferExecution {
    pub(crate) status: Value,
    pub(crate) source: TransferInputSource,
    pub(crate) sink: TransferOutputSink,
}

#[derive(Clone)]
struct Descriptor {
    kind: String,
    page_index: u64,
    row_count: u64,
    byte_length: u64,
    sha256: String,
}

pub(crate) struct TransferInputSource {
    session_id: String,
    attempt: u64,
    header: Map<String, Value>,
    request_hash: String,
    pages: Vec<(Descriptor, PathBuf)>,
    cursor: usize,
    canceled: Arc<AtomicBool>,
}

pub(crate) struct TransferOutputSink {
    session_id: String,
    attempt: u64,
    root: PathBuf,
    header: Option<Map<String, Value>>,
    pages: Vec<(Descriptor, PathBuf)>,
    staged_bytes: u64,
    reserved_bytes: u64,
    service_bytes: Arc<AtomicU64>,
    committed: bool,
}

impl NativeTransferOwner {
    pub(crate) fn new(profile_runtime_root: &Path) -> Result<Self, String> {
        let root = profile_runtime_root.join("citation-graph-transfer");
        if root.exists() {
            fs::remove_dir_all(&root).map_err(|_| "transfer_unavailable".to_owned())?;
        }
        secure_directory(&root)?;
        Ok(Self {
            root,
            sessions: HashMap::new(),
            idempotency: HashMap::new(),
            next_id: 1,
            stopping: false,
            service_bytes: Arc::new(AtomicU64::new(0)),
        })
    }

    pub(crate) fn snapshot(&self) -> Value {
        json!({
            "state":if self.stopping {"stopping"} else if self.sessions.is_empty() {"idle"} else {"active"},
            "sessions":self.sessions.len(),
            "stagedBytes":self.total_staged_bytes(),
        })
    }

    pub(crate) fn reap(&mut self, now_ms: u64) {
        let expired: Vec<String> = self
            .sessions
            .values()
            .filter(|session| {
                now_ms.saturating_sub(session.last_activity_at_ms) >= IDLE_TTL_MS
                    || now_ms.saturating_sub(session.created_at_ms) >= ABSOLUTE_TTL_MS
            })
            .map(|session| session.id.clone())
            .collect();
        for session_id in expired {
            self.remove_session(&session_id);
        }
    }

    pub(crate) fn stop(&mut self) {
        self.stopping = true;
        for session in self.sessions.values() {
            session.canceled.store(true, Ordering::Release);
        }
        self.sessions.clear();
        self.idempotency.clear();
        self.service_bytes.store(0, Ordering::Release);
        let _ = fs::remove_dir_all(&self.root);
    }

    pub(crate) fn handle(
        &mut self,
        action: Value,
        now_ms: u64,
    ) -> Result<TransferDispatch, String> {
        if self.stopping {
            return Err("transfer_stopping".to_owned());
        }
        self.reap(now_ms);
        let action_name = bounded_string(&action["action"], 64)?;
        match action_name {
            "begin" => self.begin(action, now_ms).map(TransferDispatch::Response),
            "put_input_page" => self
                .put_input_page(action, now_ms)
                .map(TransferDispatch::Response),
            "seal_input" => self
                .seal_input(action, now_ms)
                .map(TransferDispatch::Response),
            "status" => self.status_action(action).map(TransferDispatch::Response),
            "execute" => self.execute(action, now_ms),
            "get_output_manifest" => self
                .get_output_manifest(action)
                .map(TransferDispatch::Response),
            "get_output_page" => self.get_output_page(action).map(TransferDispatch::Response),
            "cancel" => self.cancel(action).map(TransferDispatch::Response),
            _ => Err("invalid_request".to_owned()),
        }
    }

    pub(crate) fn handle_content(&mut self, action: Value, now_ms: u64) -> Result<Value, String> {
        let action_name = bounded_string(&action["action"], 64)?;
        if action_name == "execute" {
            return Err("invalid_request".to_owned());
        }
        if action_name == "begin" {
            if action["manifest"]["transferVersion"] != CONTENT_TRANSFER_VERSION {
                return Err("invalid_request".to_owned());
            }
        } else {
            let session_id = bounded_string(&action["sessionId"], 128)?;
            if self.sessions.get(session_id).is_none_or(|session| {
                session.manifest["transferVersion"] != CONTENT_TRANSFER_VERSION
            }) {
                return Err("transfer_not_found".to_owned());
            }
        }
        match self.handle(action, now_ms)? {
            TransferDispatch::Response(value) => Ok(value),
            TransferDispatch::Execute(_) => Err("invalid_request".to_owned()),
        }
    }

    pub(crate) fn mark_executing(&mut self, session_id: &str, attempt: u64, now_ms: u64) {
        if let Some(session) = self.sessions.get_mut(session_id)
            && session.active_attempt == Some(attempt)
        {
            session.state = "executing";
            session.last_activity_at_ms = now_ms;
        }
    }

    pub(crate) fn reject_queued(&mut self, session_id: &str, attempt: u64, now_ms: u64) {
        if let Some(session) = self.sessions.get_mut(session_id)
            && session.active_attempt == Some(attempt)
            && session.state == "queued"
        {
            session.active_attempt = None;
            session.attempts = session.attempts.saturating_sub(1);
            session.state = "input_sealed";
            session.last_activity_at_ms = now_ms;
            let _ = fs::remove_dir_all(session.root.join(format!("attempt-{attempt}")));
        }
    }

    pub(crate) fn finish_attempt(
        &mut self,
        session_id: &str,
        attempt: u64,
        result: Result<Value, String>,
        now_ms: u64,
    ) {
        let Some(session) = self.sessions.get_mut(session_id) else {
            release_publication_result(&self.service_bytes, &result);
            return;
        };
        if session.active_attempt != Some(attempt) {
            return;
        }
        session.active_attempt = None;
        session.last_activity_at_ms = now_ms;
        match result {
            Ok(publication) => {
                let parsed = parse_publication(&publication);
                match parsed {
                    Ok((manifest, pages)) => {
                        session.output_manifest = Some(manifest);
                        session.output_pages = pages;
                        session.last_failure = None;
                        session.state = "completed";
                    }
                    Err(code) => {
                        release_publication_value(&self.service_bytes, &publication);
                        fail_attempt(session, code, now_ms);
                    }
                }
            }
            Err(code) => fail_attempt(session, &code, now_ms),
        }
    }

    pub(crate) fn topic_apply_assets(
        &self,
        session_id: &str,
    ) -> Result<Vec<synthesis_application::TopicAsset>, String> {
        let session = self
            .sessions
            .get(session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?;
        if session.state != "input_sealed"
            || session.manifest["transferVersion"] != CONTENT_TRANSFER_VERSION
            || session.manifest["encoding"] != CONTENT_TRANSFER_ENCODING
            || session.manifest["direction"] != "input"
            || session.manifest["header"]["target"] != "topic_apply_assets"
        {
            return Err("transfer_conflict".to_owned());
        }
        let descriptors = descriptors(&session.manifest)?;
        if descriptors.iter().enumerate().any(|(index, descriptor)| {
            descriptor.kind != "content" || descriptor.page_index != index as u64
        }) {
            return Err("transfer_conflict".to_owned());
        }
        let assets = session.manifest["header"]["assets"]
            .as_array()
            .filter(|assets| assets.len() <= 256)
            .ok_or_else(|| "transfer_conflict".to_owned())?;
        let mut next_page = 0_usize;
        let mut result = Vec::with_capacity(assets.len());
        for asset in assets {
            exact(
                asset,
                &[
                    "id",
                    "mediaType",
                    "byteLength",
                    "sha256",
                    "firstPage",
                    "pageCount",
                ],
            )?;
            let id = bounded_string(&asset["id"], 128)?.to_owned();
            let media_type = bounded_string(&asset["mediaType"], 64)?.to_owned();
            if !matches!(
                media_type.as_str(),
                "application/json" | "text/markdown" | "text/plain"
            ) {
                return Err("transfer_conflict".to_owned());
            }
            let byte_length = asset["byteLength"]
                .as_u64()
                .ok_or_else(|| "transfer_conflict".to_owned())?;
            let expected_hash = asset["sha256"]
                .as_str()
                .filter(|value| value.len() == 71 && value.starts_with("sha256:"))
                .ok_or_else(|| "transfer_conflict".to_owned())?;
            let first_page = asset["firstPage"]
                .as_u64()
                .map(|value| value as usize)
                .ok_or_else(|| "transfer_conflict".to_owned())?;
            let page_count = asset["pageCount"]
                .as_u64()
                .map(|value| value as usize)
                .filter(|value| *value > 0)
                .ok_or_else(|| "transfer_conflict".to_owned())?;
            if first_page != next_page || first_page.saturating_add(page_count) > descriptors.len()
            {
                return Err("transfer_conflict".to_owned());
            }
            let mut text = String::new();
            for descriptor in &descriptors[first_page..first_page + page_count] {
                let staged = session
                    .pages
                    .get(&(descriptor.kind.clone(), descriptor.page_index))
                    .ok_or_else(|| "transfer_incomplete".to_owned())?;
                let page = read_value(&staged.path)?;
                page_identity(&page)?;
                let rows = page["rows"]
                    .as_array()
                    .filter(|rows| rows.len() == 1)
                    .ok_or_else(|| "transfer_conflict".to_owned())?;
                text.push_str(
                    rows[0]
                        .as_str()
                        .ok_or_else(|| "transfer_conflict".to_owned())?,
                );
            }
            if text.len() as u64 != byte_length
                || canonical_sha256(&text).map_err(|_| "transfer_conflict".to_owned())?
                    != expected_hash
            {
                return Err("transfer_conflict".to_owned());
            }
            result.push(synthesis_application::TopicAsset {
                id,
                media_type,
                text,
            });
            next_page += page_count;
        }
        if next_page != descriptors.len() {
            return Err("transfer_conflict".to_owned());
        }
        Ok(result)
    }

    pub(crate) fn publish_client_result(
        &mut self,
        capability: &str,
        result: &Value,
        now_ms: u64,
    ) -> Result<Value, String> {
        self.reap(now_ms);
        if self.stopping {
            return Err("transfer_stopping".to_owned());
        }
        if self.sessions.len() >= MAX_SESSIONS {
            return Err("transfer_busy".to_owned());
        }
        if !capability.starts_with("client.") || capability.len() > 128 {
            return Err("invalid_request".to_owned());
        }
        let content = canonical_json(result).map_err(|_| "production_projection_invalid")?;
        if content.len() as u64 > MAX_DIRECTION_BYTES {
            return Err("transfer_limit_exceeded".to_owned());
        }
        let id = format!("native-transfer:{}", self.next_id);
        let session_root = self.root.join(format!("session-{}", self.next_id));
        self.next_id += 1;
        let output_root = session_root.join("output");
        secure_directory(&output_root)?;
        let mut reserved_bytes = 0_u64;
        let published = (|| {
            let mut output_pages = BTreeMap::new();
            let mut output_descriptors = Vec::new();
            for (page_index, chunk) in content_text_chunks(&content).into_iter().enumerate() {
                let rows = json!([chunk]);
                let canonical_rows = canonical_json(&rows)
                    .map_err(|_| "production_projection_invalid".to_owned())?;
                if canonical_rows.len() as u64 > MAX_PAGE_BYTES {
                    return Err("transfer_limit_exceeded".to_owned());
                }
                reserve_bytes(&self.service_bytes, canonical_rows.len() as u64)?;
                reserved_bytes += canonical_rows.len() as u64;
                let descriptor = Descriptor {
                    kind: "content".into(),
                    page_index: page_index as u64,
                    row_count: 1,
                    byte_length: canonical_rows.len() as u64,
                    sha256: canonical_sha256(&rows)
                        .map_err(|_| "production_projection_invalid".to_owned())?,
                };
                let page = json!({
                    "descriptor":descriptor_value(&descriptor),
                    "rows":rows,
                });
                let path = output_root.join(page_filename("content", page_index as u64));
                atomic_write(
                    &path,
                    canonical_json(&page)
                        .map_err(|_| "production_projection_invalid".to_owned())?
                        .as_bytes(),
                )?;
                output_pages.insert(
                    ("content".into(), page_index as u64),
                    StagedPage {
                        path,
                        byte_length: descriptor.byte_length,
                    },
                );
                output_descriptors.push(descriptor_value(&descriptor));
            }
            let output_body = json!({
                "transferVersion":CONTENT_TRANSFER_VERSION,
                "encoding":CONTENT_TRANSFER_ENCODING,
                "direction":"output",
                "header":{
                    "target":"production_client_result",
                    "capability":capability,
                    "byteLength":content.len(),
                    "sha256":canonical_sha256(&content)
                        .map_err(|_| "production_projection_invalid".to_owned())?,
                },
                "pages":output_descriptors,
            });
            let mut output_manifest = output_body.clone();
            output_manifest
                .as_object_mut()
                .expect("output manifest")
                .insert(
                    "rootSha256".into(),
                    Value::String(
                        canonical_sha256(&output_body)
                            .map_err(|_| "production_projection_invalid".to_owned())?,
                    ),
                );
            atomic_write(
                &session_root.join("output-manifest.json"),
                canonical_json(&output_manifest)
                    .map_err(|_| "production_projection_invalid".to_owned())?
                    .as_bytes(),
            )?;
            Ok((output_manifest, output_pages))
        })();
        let (output_manifest, output_pages) = match published {
            Ok(value) => value,
            Err(code) => {
                self.service_bytes
                    .fetch_sub(reserved_bytes, Ordering::AcqRel);
                let _ = fs::remove_dir_all(&session_root);
                return Err(code);
            }
        };
        let input_body = json!({
            "transferVersion":CONTENT_TRANSFER_VERSION,
            "encoding":CONTENT_TRANSFER_ENCODING,
            "direction":"input",
            "header":{"target":"production_client_result"},
            "pages":[],
        });
        let mut input_manifest = input_body.clone();
        input_manifest
            .as_object_mut()
            .expect("input manifest")
            .insert(
                "rootSha256".into(),
                Value::String(
                    canonical_sha256(&input_body)
                        .map_err(|_| "production_projection_invalid".to_owned())?,
                ),
            );
        let idempotency_key = format!("result:{id}");
        self.idempotency.insert(idempotency_key.clone(), id.clone());
        self.sessions.insert(
            id.clone(),
            Session {
                id: id.clone(),
                idempotency_key,
                root: session_root,
                manifest: input_manifest,
                pages: BTreeMap::new(),
                state: "completed",
                staged_bytes: 0,
                created_at_ms: now_ms,
                last_activity_at_ms: now_ms,
                attempts: 0,
                active_attempt: None,
                last_failure: None,
                output_manifest: Some(output_manifest),
                output_pages,
                canceled: Arc::new(AtomicBool::new(false)),
            },
        );
        Ok(json!({"contentTransfer":{"sessionId":id}}))
    }

    fn begin(&mut self, action: Value, now_ms: u64) -> Result<Value, String> {
        exact(&action, &["action", "idempotencyKey", "manifest"])?;
        let key = bounded_string(&action["idempotencyKey"], 128)?.to_owned();
        descriptors(&action["manifest"])?;
        if let Some(session_id) = self.idempotency.get(&key) {
            let session = self
                .sessions
                .get(session_id)
                .ok_or_else(|| "transfer_not_found".to_owned())?;
            if session.manifest != action["manifest"] {
                return Err("transfer_conflict".to_owned());
            }
            return Ok(status(session));
        }
        if self.sessions.len() >= MAX_SESSIONS {
            return Err("transfer_busy".to_owned());
        }
        let id = format!("native-transfer:{}", self.next_id);
        self.next_id += 1;
        let session_root = self.root.join(format!("session-{}", self.next_id - 1));
        secure_directory(&session_root.join("input"))?;
        atomic_write(
            &session_root.join("input-manifest.json"),
            canonical_json(&action["manifest"])
                .map_err(|_| "invalid_request".to_owned())?
                .as_bytes(),
        )?;
        let session = Session {
            id: id.clone(),
            idempotency_key: key.clone(),
            root: session_root,
            manifest: action["manifest"].clone(),
            pages: BTreeMap::new(),
            state: "receiving_input",
            staged_bytes: 0,
            created_at_ms: now_ms,
            last_activity_at_ms: now_ms,
            attempts: 0,
            active_attempt: None,
            last_failure: None,
            output_manifest: None,
            output_pages: BTreeMap::new(),
            canceled: Arc::new(AtomicBool::new(false)),
        };
        let result = status(&session);
        self.idempotency.insert(key, id.clone());
        self.sessions.insert(id, session);
        Ok(result)
    }

    fn put_input_page(&mut self, action: Value, now_ms: u64) -> Result<Value, String> {
        exact(&action, &["action", "sessionId", "page"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?.to_owned();
        let session = self
            .sessions
            .get_mut(&session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?;
        if session.state != "receiving_input" {
            return Err("transfer_conflict".to_owned());
        }
        let (kind, index, bytes) = page_identity(&action["page"])?;
        let expected = descriptors(&session.manifest)?
            .into_iter()
            .find(|entry| entry.kind == kind && entry.page_index == index)
            .ok_or_else(|| "transfer_conflict".to_owned())?;
        let descriptor = &action["page"]["descriptor"];
        if descriptor["rowCount"] != expected.row_count
            || descriptor["byteLength"] != expected.byte_length
            || descriptor["sha256"] != expected.sha256
        {
            return Err("transfer_conflict".to_owned());
        }
        let identity = (kind.clone(), index);
        if let Some(previous) = session.pages.get(&identity) {
            let previous_value = read_value(&previous.path)?;
            if previous_value != action["page"] {
                return Err("transfer_conflict".to_owned());
            }
        } else {
            if session.staged_bytes.saturating_add(bytes) > MAX_DIRECTION_BYTES {
                return Err("transfer_limit_exceeded".to_owned());
            }
            reserve_bytes(&self.service_bytes, bytes)?;
            let path = session.root.join("input").join(page_filename(&kind, index));
            if let Err(code) = atomic_write(
                &path,
                canonical_json(&action["page"])
                    .map_err(|_| "invalid_request".to_owned())?
                    .as_bytes(),
            ) {
                self.service_bytes.fetch_sub(bytes, Ordering::AcqRel);
                return Err(code);
            }
            session.pages.insert(
                identity,
                StagedPage {
                    path,
                    byte_length: expected.byte_length,
                },
            );
            session.staged_bytes += bytes;
        }
        session.last_activity_at_ms = now_ms;
        Ok(status(session))
    }

    fn seal_input(&mut self, action: Value, now_ms: u64) -> Result<Value, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?;
        let session = self
            .sessions
            .get_mut(session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?;
        if session.state == "input_sealed" {
            return Ok(status(session));
        }
        if session.state != "receiving_input" {
            return Err("transfer_conflict".to_owned());
        }
        if session.pages.len() != descriptors(&session.manifest)?.len() {
            return Err("transfer_incomplete".to_owned());
        }
        session.state = "input_sealed";
        session.last_activity_at_ms = now_ms;
        Ok(status(session))
    }

    fn status_action(&self, action: Value) -> Result<Value, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?;
        self.sessions
            .get(session_id)
            .map(status)
            .ok_or_else(|| "transfer_not_found".to_owned())
    }

    fn execute(&mut self, action: Value, now_ms: u64) -> Result<TransferDispatch, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?.to_owned();
        let session = self
            .sessions
            .get_mut(&session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?;
        if session.manifest["transferVersion"] != TRANSFER_VERSION {
            return Err("invalid_request".to_owned());
        }
        if matches!(
            session.state,
            "queued" | "executing" | "publishing" | "completed"
        ) {
            return Ok(TransferDispatch::Response(status(session)));
        }
        if session.state != "input_sealed" {
            return Err("transfer_conflict".to_owned());
        }
        session.attempts += 1;
        let attempt = session.attempts;
        session.active_attempt = Some(attempt);
        session.state = "queued";
        session.last_activity_at_ms = now_ms;
        session.last_failure = None;
        let attempt_root = session.root.join(format!("attempt-{attempt}"));
        if attempt_root.exists() {
            fs::remove_dir_all(&attempt_root).map_err(|_| "transfer_unavailable".to_owned())?;
        }
        secure_directory(&attempt_root)?;
        let input_descriptors = descriptors(&session.manifest)?;
        let pages = input_descriptors
            .into_iter()
            .map(|descriptor| {
                let path = session
                    .pages
                    .get(&(descriptor.kind.clone(), descriptor.page_index))
                    .ok_or_else(|| "transfer_incomplete".to_owned())?
                    .path
                    .clone();
                Ok((descriptor, path))
            })
            .collect::<Result<Vec<_>, String>>()?;
        let header = session.manifest["header"]
            .as_object()
            .cloned()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let worker_descriptors = pages
            .iter()
            .map(|(descriptor, _)| {
                Ok(PageDescriptor {
                    section: input_section(&descriptor.kind)?.to_owned(),
                    page_index: descriptor.page_index,
                    row_count: descriptor.row_count as usize,
                    byte_length: descriptor.byte_length as usize,
                    sha256: descriptor.sha256.clone(),
                })
            })
            .collect::<Result<Vec<_>, String>>()?;
        let request_hash = paged_request_hash(
            CITATION_GRAPH_BUILD_TRANSFER_OPERATION,
            &header,
            &worker_descriptors,
        )
        .map_err(str::to_owned)?;
        let source = TransferInputSource {
            session_id: session_id.clone(),
            attempt,
            header,
            request_hash,
            pages,
            cursor: 0,
            canceled: Arc::clone(&session.canceled),
        };
        let sink = TransferOutputSink {
            session_id,
            attempt,
            root: attempt_root,
            header: None,
            pages: Vec::new(),
            staged_bytes: 0,
            reserved_bytes: 0,
            service_bytes: Arc::clone(&self.service_bytes),
            committed: false,
        };
        Ok(TransferDispatch::Execute(Box::new(TransferExecution {
            status: status(session),
            source,
            sink,
        })))
    }

    fn get_output_manifest(&self, action: Value) -> Result<Value, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?;
        self.sessions
            .get(session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?
            .output_manifest
            .clone()
            .ok_or_else(|| "transfer_output_not_ready".to_owned())
    }

    fn get_output_page(&self, action: Value) -> Result<Value, String> {
        exact(&action, &["action", "sessionId", "kind", "pageIndex"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?;
        let kind = bounded_string(&action["kind"], 64)?;
        let page_index = action["pageIndex"]
            .as_u64()
            .ok_or_else(|| "invalid_request".to_owned())?;
        let page = self
            .sessions
            .get(session_id)
            .ok_or_else(|| "transfer_not_found".to_owned())?
            .output_pages
            .get(&(kind.to_owned(), page_index))
            .ok_or_else(|| "transfer_output_not_ready".to_owned())?;
        read_value(&page.path)
    }

    fn cancel(&mut self, action: Value) -> Result<Value, String> {
        exact(&action, &["action", "sessionId"])?;
        let session_id = bounded_string(&action["sessionId"], 128)?.to_owned();
        if !self.sessions.contains_key(&session_id) {
            return Err("transfer_not_found".to_owned());
        }
        self.remove_session(&session_id);
        Ok(json!({"canceled":true}))
    }

    fn remove_session(&mut self, session_id: &str) {
        if let Some(session) = self.sessions.remove(session_id) {
            session.canceled.store(true, Ordering::Release);
            self.idempotency.remove(&session.idempotency_key);
            let bytes = session.staged_bytes
                + session
                    .output_pages
                    .values()
                    .map(|page| page.byte_length)
                    .sum::<u64>();
            self.service_bytes.fetch_sub(bytes, Ordering::AcqRel);
            let _ = fs::remove_dir_all(session.root);
        }
    }

    fn total_staged_bytes(&self) -> u64 {
        self.service_bytes.load(Ordering::Acquire)
    }
}

impl TransferInputSource {
    pub(crate) fn identity(&self) -> (&str, u64) {
        (&self.session_id, self.attempt)
    }

    pub(crate) fn cancellation(&self) -> Arc<AtomicBool> {
        Arc::clone(&self.canceled)
    }
}

impl PagedInputSource for TransferInputSource {
    fn header(&self) -> Result<Map<String, Value>, String> {
        Ok(self.header.clone())
    }

    fn request_hash(&self) -> &str {
        &self.request_hash
    }

    fn next_page(&mut self) -> Result<Option<PagedInputFrame>, String> {
        if self.canceled.load(Ordering::Acquire) {
            return Err("worker_canceled".to_owned());
        }
        let Some((descriptor, path)) = self.pages.get(self.cursor) else {
            return Ok(None);
        };
        self.cursor += 1;
        let page = read_value(path)?;
        let rows = page["rows"]
            .as_array()
            .ok_or_else(|| "transfer_conflict".to_owned())?;
        let raw_rows = canonical_json(rows).map_err(|_| "transfer_conflict".to_owned())?;
        if raw_rows.len() as u64 != descriptor.byte_length
            || canonical_sha256(rows).map_err(|_| "transfer_conflict".to_owned())?
                != descriptor.sha256
            || rows.len() as u64 != descriptor.row_count
        {
            return Err("transfer_conflict".to_owned());
        }
        Ok(Some(PagedInputFrame {
            section: input_section(&descriptor.kind)?.to_owned(),
            page_index: descriptor.page_index,
            row_count: descriptor.row_count as usize,
            raw_rows,
        }))
    }
}

impl PagedOutputSink for TransferOutputSink {
    fn begin(&mut self, header: Map<String, Value>) -> Result<(), String> {
        if self.header.is_some() {
            return Err("worker_result_invalid".to_owned());
        }
        self.header = Some(header);
        Ok(())
    }

    fn stage_page(&mut self, frame: PagedOutputFrame) -> Result<(), String> {
        let kind = output_kind(&frame.section)?.to_owned();
        let expected_index = self
            .pages
            .iter()
            .filter(|(descriptor, _)| descriptor.kind == kind)
            .count() as u64;
        if frame.page_index != expected_index {
            return Err("worker_result_invalid".to_owned());
        }
        let rows = Value::Array(frame.rows);
        let canonical = canonical_json(&rows).map_err(|_| "worker_result_invalid".to_owned())?;
        if canonical.len() as u64 > MAX_PAGE_BYTES
            || self.staged_bytes.saturating_add(canonical.len() as u64) > MAX_DIRECTION_BYTES
        {
            return Err("transfer_limit_exceeded".to_owned());
        }
        let descriptor = Descriptor {
            kind: kind.clone(),
            page_index: frame.page_index,
            row_count: rows.as_array().map_or(0, Vec::len) as u64,
            byte_length: canonical.len() as u64,
            sha256: canonical_sha256(&rows).map_err(|_| "worker_result_invalid".to_owned())?,
        };
        let page = json!({
            "descriptor":descriptor_value(&descriptor),
            "rows":rows,
        });
        let page_bytes = canonical_json(&page).map_err(|_| "worker_result_invalid".to_owned())?;
        reserve_bytes(&self.service_bytes, canonical.len() as u64)?;
        let path = self.root.join(page_filename(&kind, frame.page_index));
        if let Err(code) = atomic_write(&path, page_bytes.as_bytes()) {
            self.service_bytes
                .fetch_sub(canonical.len() as u64, Ordering::AcqRel);
            return Err(code);
        }
        self.staged_bytes += descriptor.byte_length;
        self.reserved_bytes += descriptor.byte_length;
        self.pages.push((descriptor, path));
        Ok(())
    }

    fn commit(&mut self) -> Result<Value, String> {
        let header = self
            .header
            .take()
            .ok_or_else(|| "worker_result_invalid".to_owned())?;
        let descriptors = self
            .pages
            .iter()
            .map(|(descriptor, _)| descriptor_value(descriptor))
            .collect::<Vec<_>>();
        let body = json!({
            "transferVersion":TRANSFER_VERSION,
            "encoding":TRANSFER_ENCODING,
            "direction":"output",
            "header":header,
            "pages":descriptors,
        });
        let mut manifest = body.clone();
        manifest.as_object_mut().expect("manifest").insert(
            "rootSha256".to_owned(),
            Value::String(canonical_sha256(&body).map_err(|_| "worker_result_invalid".to_owned())?),
        );
        let manifest_path = self.root.join("manifest.json");
        atomic_write(
            &manifest_path,
            canonical_json(&manifest)
                .map_err(|_| "worker_result_invalid".to_owned())?
                .as_bytes(),
        )?;
        self.committed = true;
        Ok(json!({
            "sessionId":self.session_id,
            "attempt":self.attempt,
            "attemptRoot":self.root.to_string_lossy(),
            "stagedBytes":self.reserved_bytes,
            "manifest":manifest,
            "pages":self.pages.iter().map(|(descriptor, path)| json!({
                "descriptor":descriptor_value(descriptor),
                "path":path.to_string_lossy(),
            })).collect::<Vec<_>>(),
        }))
    }

    fn rollback(&mut self) {
        if !self.committed {
            self.service_bytes
                .fetch_sub(self.reserved_bytes, Ordering::AcqRel);
            self.reserved_bytes = 0;
            let _ = fs::remove_dir_all(&self.root);
        }
    }
}

fn fail_attempt(session: &mut Session, code: &str, now_ms: u64) {
    let code = match code {
        "worker_timeout"
        | "worker_canceled"
        | "worker_crashed"
        | "worker_result_invalid"
        | "worker_unavailable"
        | "transfer_limit_exceeded"
        | "transfer_conflict" => code,
        _ => "internal_error",
    };
    session.state = "input_sealed";
    session.output_manifest = None;
    session.output_pages.clear();
    session.last_failure = Some(json!({
        "code":code,
        "retryable":true,
        "atMs":now_ms,
    }));
}

type PublishedPages = BTreeMap<(String, u64), StagedPage>;

fn parse_publication(publication: &Value) -> Result<(Value, PublishedPages), &'static str> {
    let manifest = publication["manifest"].clone();
    let descriptors = descriptors_output(&manifest)?;
    let paths = publication["pages"]
        .as_array()
        .ok_or("worker_result_invalid")?;
    if paths.len() != descriptors.len() {
        return Err("worker_result_invalid");
    }
    let mut pages = BTreeMap::new();
    for (descriptor, entry) in descriptors.into_iter().zip(paths) {
        let path = entry["path"]
            .as_str()
            .map(PathBuf::from)
            .ok_or("worker_result_invalid")?;
        if !path.is_file() || entry["descriptor"] != descriptor_value(&descriptor) {
            return Err("worker_result_invalid");
        }
        pages.insert(
            (descriptor.kind.clone(), descriptor.page_index),
            StagedPage {
                path,
                byte_length: descriptor.byte_length,
            },
        );
    }
    Ok((manifest, pages))
}

fn object(value: &Value) -> Result<&Map<String, Value>, String> {
    value
        .as_object()
        .ok_or_else(|| "invalid_request".to_owned())
}

fn exact(value: &Value, fields: &[&str]) -> Result<(), String> {
    let value = object(value)?;
    if value.len() != fields.len() || fields.iter().any(|field| !value.contains_key(*field)) {
        return Err("invalid_request".to_owned());
    }
    Ok(())
}

fn bounded_string(value: &Value, max: usize) -> Result<&str, String> {
    value
        .as_str()
        .filter(|value| !value.is_empty() && value.len() <= max)
        .ok_or_else(|| "invalid_request".to_owned())
}

fn descriptors(manifest: &Value) -> Result<Vec<Descriptor>, String> {
    descriptors_direction(manifest, "input").map_err(str::to_owned)
}

fn descriptors_output(manifest: &Value) -> Result<Vec<Descriptor>, &'static str> {
    descriptors_direction(manifest, "output")
}

fn descriptors_direction(
    manifest: &Value,
    direction: &str,
) -> Result<Vec<Descriptor>, &'static str> {
    let object = manifest.as_object().ok_or("invalid_request")?;
    let citation_transfer = manifest["transferVersion"] == TRANSFER_VERSION
        && manifest["encoding"] == TRANSFER_ENCODING;
    let content_transfer = manifest["transferVersion"] == CONTENT_TRANSFER_VERSION
        && manifest["encoding"] == CONTENT_TRANSFER_ENCODING
        && matches!(
            manifest["header"]["target"].as_str(),
            Some("topic_apply_assets" | "production_client_result")
        );
    if object.len() != 6
        || [
            "transferVersion",
            "encoding",
            "direction",
            "header",
            "pages",
            "rootSha256",
        ]
        .iter()
        .any(|field| !object.contains_key(*field))
        || (!citation_transfer && !content_transfer)
        || manifest["direction"] != direction
        || !manifest["header"].is_object()
    {
        return Err("invalid_request");
    }
    let pages = manifest["pages"].as_array().ok_or("invalid_request")?;
    if pages.len() > 256 {
        return Err("transfer_limit_exceeded");
    }
    let mut result = Vec::with_capacity(pages.len());
    let mut total = 0_u64;
    for page in pages {
        let page = page.as_object().ok_or("invalid_request")?;
        if page.len() != 5
            || ["kind", "pageIndex", "rowCount", "byteLength", "sha256"]
                .iter()
                .any(|field| !page.contains_key(*field))
        {
            return Err("invalid_request");
        }
        let kind = page["kind"]
            .as_str()
            .filter(|value| !value.is_empty() && value.len() <= 64)
            .ok_or("invalid_request")?
            .to_owned();
        let page_index = page["pageIndex"].as_u64().ok_or("invalid_request")?;
        let row_count = page["rowCount"].as_u64().ok_or("invalid_request")?;
        let byte_length = page["byteLength"].as_u64().ok_or("invalid_request")?;
        let sha256 = page["sha256"]
            .as_str()
            .filter(|value| value.len() == 71 && value.starts_with("sha256:"))
            .ok_or("invalid_request")?
            .to_owned();
        total = total
            .checked_add(byte_length)
            .ok_or("transfer_limit_exceeded")?;
        if byte_length > MAX_PAGE_BYTES || total > MAX_DIRECTION_BYTES {
            return Err("transfer_limit_exceeded");
        }
        result.push(Descriptor {
            kind,
            page_index,
            row_count,
            byte_length,
            sha256,
        });
    }
    let mut body = manifest.clone();
    body.as_object_mut()
        .expect("manifest object")
        .remove("rootSha256");
    if manifest["rootSha256"] != canonical_sha256(&body).map_err(|_| "invalid_request")? {
        return Err("invalid_request");
    }
    Ok(result)
}

fn page_identity(page: &Value) -> Result<(String, u64, u64), String> {
    exact(page, &["descriptor", "rows"])?;
    let descriptor = &page["descriptor"];
    exact(
        descriptor,
        &["kind", "pageIndex", "rowCount", "byteLength", "sha256"],
    )?;
    let rows = page["rows"]
        .as_array()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let kind = bounded_string(&descriptor["kind"], 64)?.to_owned();
    let page_index = descriptor["pageIndex"]
        .as_u64()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let row_count = descriptor["rowCount"]
        .as_u64()
        .ok_or_else(|| "invalid_request".to_owned())?;
    let byte_length = descriptor["byteLength"]
        .as_u64()
        .ok_or_else(|| "invalid_request".to_owned())?;
    if byte_length > MAX_PAGE_BYTES
        || row_count != rows.len() as u64
        || byte_length
            != canonical_json(rows)
                .map_err(|_| "invalid_request".to_owned())?
                .len() as u64
        || descriptor["sha256"]
            != canonical_sha256(rows).map_err(|_| "invalid_request".to_owned())?
    {
        return Err("transfer_conflict".to_owned());
    }
    Ok((kind, page_index, byte_length))
}

fn progress(session: &Session, output: bool) -> Value {
    let manifest = if output {
        session.output_manifest.as_ref()
    } else {
        Some(&session.manifest)
    };
    let total_pages = manifest
        .and_then(|manifest| manifest["pages"].as_array())
        .map_or(0, Vec::len);
    let pages = if output {
        session.output_pages.len()
    } else {
        session.pages.len()
    };
    let staged_bytes = if output {
        session
            .output_pages
            .values()
            .map(|page| page.byte_length)
            .sum()
    } else {
        session.staged_bytes
    };
    json!({
        "receivedPages":pages,
        "totalPages":total_pages,
        "stagedBytes":staged_bytes,
    })
}

fn status(session: &Session) -> Value {
    let mut execution = json!({"attempts":session.attempts});
    if let Some(last_failure) = &session.last_failure {
        execution
            .as_object_mut()
            .expect("execution object")
            .insert("lastFailure".to_owned(), last_failure.clone());
    }
    let mut value = json!({
        "sessionId":session.id,
        "state":session.state,
        "input":progress(session, false),
        "execution":execution,
        "stagedBytes":session.staged_bytes,
        "createdAtMs":session.created_at_ms,
        "lastActivityAtMs":session.last_activity_at_ms,
    });
    if session.output_manifest.is_some() {
        value
            .as_object_mut()
            .expect("status object")
            .insert("output".to_owned(), progress(session, true));
    }
    value
}

fn input_section(kind: &str) -> Result<&'static str, String> {
    match kind {
        "library_nodes" => Ok("libraryNodes"),
        "references" => Ok("references"),
        _ => Err("transfer_conflict".to_owned()),
    }
}

fn output_kind(section: &str) -> Result<&'static str, String> {
    match section {
        "nodes" => Ok("nodes"),
        "resolvedEdges" => Ok("resolved_edges"),
        "aggregateEdges" => Ok("aggregate_edges"),
        "sourceOwnership" => Ok("source_ownership"),
        "incomingGroups" => Ok("incoming_groups"),
        "lightMetrics" => Ok("light_metrics"),
        _ => Err("worker_result_invalid".to_owned()),
    }
}

fn descriptor_value(descriptor: &Descriptor) -> Value {
    json!({
        "kind":descriptor.kind,
        "pageIndex":descriptor.page_index,
        "rowCount":descriptor.row_count,
        "byteLength":descriptor.byte_length,
        "sha256":descriptor.sha256,
    })
}

fn page_filename(kind: &str, page_index: u64) -> String {
    format!("{kind}-{page_index}.json")
}

fn content_text_chunks(content: &str) -> Vec<String> {
    let mut chunks = Vec::new();
    let mut chunk = String::new();
    for character in content.chars() {
        if !chunk.is_empty()
            && chunk.len().saturating_add(character.len_utf8()) > CONTENT_CHUNK_TARGET_BYTES
        {
            chunks.push(std::mem::take(&mut chunk));
        }
        chunk.push(character);
    }
    if !chunk.is_empty() || chunks.is_empty() {
        chunks.push(chunk);
    }
    chunks
}

fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    let temporary = path.with_extension("tmp");
    fs::write(&temporary, bytes).map_err(|_| "transfer_unavailable".to_owned())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(&temporary, fs::Permissions::from_mode(0o600))
            .map_err(|_| "transfer_unavailable".to_owned())?;
    }
    fs::rename(&temporary, path).map_err(|_| "transfer_unavailable".to_owned())
}

fn reserve_bytes(total: &AtomicU64, bytes: u64) -> Result<(), String> {
    let mut current = total.load(Ordering::Acquire);
    loop {
        let next = current
            .checked_add(bytes)
            .filter(|value| *value <= MAX_SERVICE_BYTES)
            .ok_or_else(|| "transfer_limit_exceeded".to_owned())?;
        match total.compare_exchange_weak(current, next, Ordering::AcqRel, Ordering::Acquire) {
            Ok(_) => return Ok(()),
            Err(actual) => current = actual,
        }
    }
}

fn release_publication_result(total: &AtomicU64, result: &Result<Value, String>) {
    if let Ok(publication) = result {
        release_publication_value(total, publication);
    }
}

fn release_publication_value(total: &AtomicU64, publication: &Value) {
    if let Some(bytes) = publication["stagedBytes"].as_u64() {
        total.fetch_sub(bytes, Ordering::AcqRel);
    }
    if let Some(root) = publication["attemptRoot"].as_str() {
        let _ = fs::remove_dir_all(root);
    }
}

fn secure_directory(path: &Path) -> Result<(), String> {
    fs::create_dir_all(path).map_err(|_| "transfer_unavailable".to_owned())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o700))
            .map_err(|_| "transfer_unavailable".to_owned())?;
    }
    Ok(())
}

fn read_value(path: &Path) -> Result<Value, String> {
    let bytes = fs::read(path).map_err(|_| "transfer_unavailable".to_owned())?;
    serde_json::from_slice(&bytes).map_err(|_| "transfer_conflict".to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temporary_root(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "synthesis-native-transfer-{label}-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ))
    }

    fn page(kind: &str, rows: Value) -> Value {
        let canonical = canonical_json(&rows).expect("canonical rows");
        json!({
            "descriptor":{
                "kind":kind,
                "pageIndex":0,
                "rowCount":rows.as_array().expect("rows").len(),
                "byteLength":canonical.len(),
                "sha256":canonical_sha256(&rows).expect("rows hash"),
            },
            "rows":rows,
        })
    }

    fn input_manifest(pages: &[Value]) -> Value {
        let body = json!({
            "transferVersion":TRANSFER_VERSION,
            "encoding":TRANSFER_ENCODING,
            "direction":"input",
            "header":{
                "contractVersion":"synthesis-citation-graph-build.v1",
                "scope":{"kind":"full","sourceIds":[]},
                "rolePriority":[],
            },
            "pages":pages.iter().map(|page| page["descriptor"].clone()).collect::<Vec<_>>(),
        });
        let mut manifest = body.clone();
        manifest.as_object_mut().expect("manifest").insert(
            "rootSha256".to_owned(),
            Value::String(canonical_sha256(&body).expect("manifest hash")),
        );
        manifest
    }

    fn topic_assets_manifest(pages: &[Value], text: &str) -> Value {
        let body = json!({
            "transferVersion":"synthesis-production-content-transfer.v1",
            "encoding":"canonical_json_text_chunks.v1",
            "direction":"input",
            "header":{
                "target":"topic_apply_assets",
                "assets":[{
                    "id":"asset/0001",
                    "mediaType":"text/markdown",
                    "byteLength":text.len(),
                    "sha256":canonical_sha256(&text).expect("asset hash"),
                    "firstPage":0,
                    "pageCount":pages.len(),
                }],
            },
            "pages":pages.iter().map(|page| page["descriptor"].clone()).collect::<Vec<_>>(),
        });
        let mut manifest = body.clone();
        manifest.as_object_mut().expect("manifest").insert(
            "rootSha256".to_owned(),
            Value::String(canonical_sha256(&body).expect("manifest hash")),
        );
        manifest
    }

    #[test]
    fn materializes_hash_bound_topic_assets_from_a_sealed_content_session() {
        let root = temporary_root("topic-content");
        let mut owner = NativeTransferOwner::new(&root).expect("owner");
        let text = "large topic body";
        let pages = [page("content", json!([text]))];
        let TransferDispatch::Response(begun) = owner
            .handle(
                json!({
                    "action":"begin",
                    "idempotencyKey":"topic-assets",
                    "manifest":topic_assets_manifest(&pages, text),
                }),
                1,
            )
            .expect("begin")
        else {
            panic!("begin response");
        };
        let session_id = begun["sessionId"].as_str().expect("session id");
        owner
            .handle(
                json!({"action":"put_input_page","sessionId":session_id,"page":pages[0]}),
                2,
            )
            .expect("put page");
        owner
            .handle(json!({"action":"seal_input","sessionId":session_id}), 3)
            .expect("seal");

        assert_eq!(
            owner.topic_apply_assets(session_id).expect("topic assets"),
            vec![synthesis_application::TopicAsset {
                id: "asset/0001".into(),
                media_type: "text/markdown".into(),
                text: text.into(),
            }]
        );
        assert!(
            owner
                .handle(json!({"action":"execute","sessionId":session_id}), 4)
                .is_err()
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn publishes_large_client_results_as_hash_bound_output_pages() {
        let root = temporary_root("client-result");
        let mut owner = NativeTransferOwner::new(&root).expect("owner");
        let result =
            json!({"artifacts":[{"payload":"x".repeat(100_000)}],"diagnostics":[],"total":1});
        let locator = owner
            .publish_client_result("client.readPaperArtifacts", &result, 10)
            .expect("publish result");
        let session_id = locator["contentTransfer"]["sessionId"]
            .as_str()
            .expect("session id");
        let TransferDispatch::Response(manifest) = owner
            .handle(
                json!({"action":"get_output_manifest","sessionId":session_id}),
                11,
            )
            .expect("manifest")
        else {
            panic!("manifest response");
        };
        assert_eq!(manifest["header"]["target"], "production_client_result");
        assert_eq!(
            manifest["header"]["capability"],
            "client.readPaperArtifacts"
        );
        assert!(manifest["pages"].as_array().expect("pages").len() > 1);
        let mut content = String::new();
        for descriptor in manifest["pages"].as_array().expect("pages") {
            let TransferDispatch::Response(page) = owner
                .handle(
                    json!({
                        "action":"get_output_page",
                        "sessionId":session_id,
                        "kind":descriptor["kind"],
                        "pageIndex":descriptor["pageIndex"],
                    }),
                    12,
                )
                .expect("page")
            else {
                panic!("page response");
            };
            content.push_str(page["rows"][0].as_str().expect("content"));
        }
        assert_eq!(
            serde_json::from_str::<Value>(&content).expect("json"),
            result
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn stages_canonical_pages_on_disk_and_reaps_idle_sessions() {
        let root = temporary_root("staging");
        let mut owner = NativeTransferOwner::new(&root).expect("owner");
        let pages = [
            page(
                "library_nodes",
                json!([{"nodeId":"paper:A","title":"A","authors":[],"aliases":[]}]),
            ),
            page("references", json!([])),
        ];
        let begun = owner
            .handle(
                json!({
                    "action":"begin",
                    "idempotencyKey":"test",
                    "manifest":input_manifest(&pages),
                }),
                1,
            )
            .expect("begin");
        let TransferDispatch::Response(begun) = begun else {
            panic!("begin response");
        };
        let session_id = begun["sessionId"].as_str().expect("session id");
        for page in pages {
            owner
                .handle(
                    json!({
                        "action":"put_input_page",
                        "sessionId":session_id,
                        "page":page,
                    }),
                    2,
                )
                .expect("stage page");
        }
        let TransferDispatch::Response(sealed) = owner
            .handle(json!({"action":"seal_input","sessionId":session_id}), 3)
            .expect("seal")
        else {
            panic!("seal response");
        };
        assert_eq!(sealed["state"], "input_sealed");
        assert_eq!(owner.sessions[session_id].pages.len(), 2);
        assert!(
            owner.sessions[session_id]
                .pages
                .values()
                .all(|page| page.path.is_file())
        );
        let TransferDispatch::Execute(execution) = owner
            .handle(json!({"action":"execute","sessionId":session_id}), 4)
            .expect("execute")
        else {
            panic!("execute dispatch");
        };
        let TransferExecution {
            source, mut sink, ..
        } = *execution;
        let (_, attempt) = source.identity();
        sink.rollback();
        owner.mark_executing(session_id, attempt, 5);
        owner.finish_attempt(session_id, attempt, Err("worker_timeout".to_owned()), 6);
        let TransferDispatch::Response(failed) = owner
            .handle(json!({"action":"status","sessionId":session_id}), 7)
            .expect("failed status")
        else {
            panic!("status response");
        };
        assert_eq!(failed["state"], "input_sealed");
        assert_eq!(
            failed["execution"]["lastFailure"],
            json!({"code":"worker_timeout","retryable":true,"atMs":6})
        );

        owner.reap(IDLE_TTL_MS + 8);
        assert_eq!(owner.snapshot()["sessions"], 0);
        assert!(
            !root
                .join("citation-graph-transfer")
                .read_dir()
                .is_ok_and(|mut entries| entries.next().is_some())
        );
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn restart_cleanup_and_attempt_rollback_are_disposable() {
        let root = temporary_root("restart");
        let stale = root.join("citation-graph-transfer/stale");
        fs::create_dir_all(&stale).expect("stale root");
        fs::write(stale.join("page.json"), b"stale").expect("stale page");
        let owner = NativeTransferOwner::new(&root).expect("owner");
        assert!(!stale.exists());
        drop(owner);

        let attempt_root = root.join("attempt");
        fs::create_dir_all(&attempt_root).expect("attempt root");
        let mut sink = TransferOutputSink {
            session_id: "session".to_owned(),
            attempt: 1,
            root: attempt_root.clone(),
            header: None,
            pages: Vec::new(),
            staged_bytes: 0,
            reserved_bytes: 0,
            service_bytes: Arc::new(AtomicU64::new(0)),
            committed: false,
        };
        sink.begin(
            json!({
                "contractVersion":"synthesis-citation-graph-build.v1",
                "scope":{"kind":"full","sourceIds":[]},
                "diagnostics":{},
            })
            .as_object()
            .expect("header")
            .clone(),
        )
        .expect("begin output");
        sink.stage_page(PagedOutputFrame {
            section: "nodes".to_owned(),
            page_index: 0,
            rows: vec![json!({"nodeId":"paper:A"})],
        })
        .expect("stage output");
        assert!(attempt_root.is_dir());
        sink.rollback();
        assert!(!attempt_root.exists());
        let _ = fs::remove_dir_all(root);
    }
}
