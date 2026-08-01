use serde_json::{Map, Value, json};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use std::sync::{Arc, Condvar, Mutex, mpsc};
use std::thread;
use std::time::{Duration, Instant};
use synthesis_protocol::{
    CITATION_GRAPH_BUILD_OPERATION, CITATION_GRAPH_BUILD_TRANSFER_OPERATION,
    CITATION_GRAPH_LAYOUT_OPERATION, CONCEPT_KB_INDEX_OPERATION, CONCEPT_KB_QUERY_OPERATION,
    METRICS_OPERATION, MetricsResult, REFERENCE_BINDING_OPERATION,
    REFERENCE_CANONICAL_DEDUPE_OPERATION, TAG_VOCABULARY_INDEX_OPERATION,
    TAG_VOCABULARY_VALIDATE_OPERATION, TOPIC_ARTIFACT_ASSEMBLE_OPERATION,
    TOPIC_ARTIFACT_VALIDATE_OPERATION, TOPIC_GRAPH_INDEX_OPERATION,
    TOPIC_MANIFEST_VALIDATE_OPERATION, TOPIC_SECTION_PATCH_OPERATION, WORKER_PROTOCOL,
    canonical_json, canonical_sha256, count_json_nodes,
};

use crate::runtime_deadline::bounded_timeout;

const WORKER_READY_DEADLINE: Duration = Duration::from_secs(5);
const DIRECT_DEADLINE: Duration = Duration::from_secs(5);
const LAYOUT_DEADLINE: Duration = Duration::from_secs(10);
const TRANSFER_DEADLINE: Duration = Duration::from_secs(30);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum WorkerOperation {
    CitationGraphLayout,
    CitationGraphMetrics,
    CitationGraphBuild,
    CitationGraphBuildTransfer,
    TagVocabularyValidate,
    TagVocabularyIndex,
    ConceptKbIndex,
    ConceptKbQuery,
    TopicGraphIndex,
    ReferenceBinding,
    ReferenceCanonicalDedupe,
    TopicManifestValidate,
    TopicArtifactAssemble,
    TopicArtifactValidate,
    TopicSectionPatch,
}

impl WorkerOperation {
    fn direct_deadline(self) -> Duration {
        match self {
            Self::CitationGraphLayout => LAYOUT_DEADLINE,
            _ => DIRECT_DEADLINE,
        }
    }

    pub(crate) fn from_protocol_name(value: &str) -> Result<Self, &'static str> {
        match value {
            CITATION_GRAPH_LAYOUT_OPERATION => Ok(Self::CitationGraphLayout),
            METRICS_OPERATION => Ok(Self::CitationGraphMetrics),
            CITATION_GRAPH_BUILD_OPERATION => Ok(Self::CitationGraphBuild),
            CITATION_GRAPH_BUILD_TRANSFER_OPERATION => Ok(Self::CitationGraphBuildTransfer),
            TAG_VOCABULARY_VALIDATE_OPERATION => Ok(Self::TagVocabularyValidate),
            TAG_VOCABULARY_INDEX_OPERATION => Ok(Self::TagVocabularyIndex),
            CONCEPT_KB_INDEX_OPERATION => Ok(Self::ConceptKbIndex),
            CONCEPT_KB_QUERY_OPERATION => Ok(Self::ConceptKbQuery),
            TOPIC_GRAPH_INDEX_OPERATION => Ok(Self::TopicGraphIndex),
            REFERENCE_BINDING_OPERATION => Ok(Self::ReferenceBinding),
            REFERENCE_CANONICAL_DEDUPE_OPERATION => Ok(Self::ReferenceCanonicalDedupe),
            TOPIC_MANIFEST_VALIDATE_OPERATION => Ok(Self::TopicManifestValidate),
            TOPIC_ARTIFACT_ASSEMBLE_OPERATION => Ok(Self::TopicArtifactAssemble),
            TOPIC_ARTIFACT_VALIDATE_OPERATION => Ok(Self::TopicArtifactValidate),
            TOPIC_SECTION_PATCH_OPERATION => Ok(Self::TopicSectionPatch),
            _ => Err("invalid_request"),
        }
    }

    pub(crate) fn protocol_name(self) -> &'static str {
        match self {
            Self::CitationGraphLayout => CITATION_GRAPH_LAYOUT_OPERATION,
            Self::CitationGraphMetrics => METRICS_OPERATION,
            Self::CitationGraphBuild => CITATION_GRAPH_BUILD_OPERATION,
            Self::CitationGraphBuildTransfer => CITATION_GRAPH_BUILD_TRANSFER_OPERATION,
            Self::TagVocabularyValidate => TAG_VOCABULARY_VALIDATE_OPERATION,
            Self::TagVocabularyIndex => TAG_VOCABULARY_INDEX_OPERATION,
            Self::ConceptKbIndex => CONCEPT_KB_INDEX_OPERATION,
            Self::ConceptKbQuery => CONCEPT_KB_QUERY_OPERATION,
            Self::TopicGraphIndex => TOPIC_GRAPH_INDEX_OPERATION,
            Self::ReferenceBinding => REFERENCE_BINDING_OPERATION,
            Self::ReferenceCanonicalDedupe => REFERENCE_CANONICAL_DEDUPE_OPERATION,
            Self::TopicManifestValidate => TOPIC_MANIFEST_VALIDATE_OPERATION,
            Self::TopicArtifactAssemble => TOPIC_ARTIFACT_ASSEMBLE_OPERATION,
            Self::TopicArtifactValidate => TOPIC_ARTIFACT_VALIDATE_OPERATION,
            Self::TopicSectionPatch => TOPIC_SECTION_PATCH_OPERATION,
        }
    }
}

pub(crate) struct PagedInputFrame {
    pub section: String,
    pub page_index: u64,
    pub row_count: usize,
    pub raw_rows: String,
}

pub(crate) trait PagedInputSource {
    fn header(&self) -> Result<Map<String, Value>, String>;
    fn request_hash(&self) -> &str;
    fn next_page(&mut self) -> Result<Option<PagedInputFrame>, String>;
}

pub(crate) struct PagedOutputFrame {
    pub section: String,
    pub page_index: u64,
    pub rows: Vec<Value>,
}

pub(crate) trait PagedOutputSink {
    fn begin(&mut self, header: Map<String, Value>) -> Result<(), String>;
    fn stage_page(&mut self, frame: PagedOutputFrame) -> Result<(), String>;
    fn commit(&mut self) -> Result<Value, String>;
    fn rollback(&mut self);
}

struct ComputePoolInner {
    active: bool,
    queued: u8,
    restart_count: u64,
    failure_count: u8,
    degraded: bool,
    stopping: bool,
}

struct WorkerChild {
    child: Child,
    stdin: ChildStdin,
    frames: mpsc::Receiver<Result<String, String>>,
}

impl WorkerChild {
    fn spawn(executable: &Path) -> Result<Self, String> {
        let mut child = Command::new(executable)
            .arg("worker")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|error| error.to_string())?;
        let stdin = child.stdin.take().ok_or("worker_unavailable")?;
        let stdout = child.stdout.take().ok_or("worker_unavailable")?;
        let (sender, frames) = mpsc::sync_channel(1);
        thread::spawn(move || {
            use std::io::{BufRead, BufReader};
            for line in BufReader::new(stdout).lines() {
                if sender
                    .send(line.map_err(|error| error.to_string()))
                    .is_err()
                {
                    return;
                }
            }
        });
        let mut worker = Self {
            child,
            stdin,
            frames,
        };
        let ready = worker.recv_frame(Instant::now() + WORKER_READY_DEADLINE, None, None)?;
        if ready["protocol"] != WORKER_PROTOCOL || ready["type"] != "ready" {
            worker.terminate();
            return Err("worker_result_invalid".to_owned());
        }
        Ok(worker)
    }

    fn send(&mut self, value: &Value) -> Result<(), String> {
        serde_json::to_writer(&mut self.stdin, value).map_err(|error| error.to_string())?;
        self.stdin
            .write_all(b"\n")
            .and_then(|_| self.stdin.flush())
            .map_err(|_| "worker_crashed".to_owned())
    }

    fn recv_frame(
        &mut self,
        deadline: Instant,
        stopping: Option<&AtomicBool>,
        canceled: Option<&AtomicBool>,
    ) -> Result<Value, String> {
        let line = loop {
            if stopping.is_some_and(|flag| flag.load(Ordering::Acquire))
                || canceled.is_some_and(|flag| flag.load(Ordering::Acquire))
            {
                return Err("worker_canceled".to_owned());
            }
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                return Err("worker_timeout".to_owned());
            }
            match self
                .frames
                .recv_timeout(remaining.min(Duration::from_millis(10)))
            {
                Ok(Ok(line)) => break line,
                Ok(Err(_)) | Err(mpsc::RecvTimeoutError::Disconnected) => {
                    return Err("worker_crashed".to_owned());
                }
                Err(mpsc::RecvTimeoutError::Timeout) => {}
            }
        };
        serde_json::from_str(&line).map_err(|_| "worker_result_invalid".to_owned())
    }

    fn terminate(&mut self) {
        let _ = self.stdin.flush();
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

impl Drop for WorkerChild {
    fn drop(&mut self) {
        self.terminate();
    }
}

pub(crate) struct NativeComputePool {
    inner: Mutex<ComputePoolInner>,
    available: Condvar,
    worker: Mutex<Option<WorkerChild>>,
    next_task_id: AtomicU64,
    stop_requested: AtomicBool,
    executable: PathBuf,
}

pub(crate) struct ComputeAdmission {
    pool: Arc<NativeComputePool>,
}

pub(crate) struct ComputeReservation {
    pool: Arc<NativeComputePool>,
    acquired: bool,
    queued: bool,
}

impl NativeComputePool {
    pub(crate) fn new() -> Self {
        Self {
            inner: Mutex::new(ComputePoolInner {
                active: false,
                queued: 0,
                restart_count: 0,
                failure_count: 0,
                degraded: false,
                stopping: false,
            }),
            available: Condvar::new(),
            worker: Mutex::new(None),
            next_task_id: AtomicU64::new(1),
            stop_requested: AtomicBool::new(false),
            executable: std::env::current_exe().unwrap_or_default(),
        }
    }

    #[cfg(test)]
    pub(crate) fn new_with_executable(executable: PathBuf) -> Self {
        let mut pool = Self::new();
        pool.executable = executable;
        pool
    }

    pub(crate) fn admit(
        self: &Arc<Self>,
        stopping: &AtomicBool,
    ) -> Result<ComputeAdmission, &'static str> {
        let mut inner = self.inner.lock().map_err(|_| "worker_unavailable")?;
        if inner.degraded || inner.stopping {
            return Err("worker_unavailable");
        }
        if inner.active {
            if inner.queued >= 2 {
                return Err("worker_busy");
            }
            inner.queued += 1;
            while inner.active
                && !stopping.load(Ordering::Acquire)
                && !inner.degraded
                && !inner.stopping
            {
                inner = self
                    .available
                    .wait(inner)
                    .map_err(|_| "worker_unavailable")?;
            }
            inner.queued = inner.queued.saturating_sub(1);
        }
        if stopping.load(Ordering::Acquire) || inner.stopping {
            return Err("worker_canceled");
        }
        if inner.degraded {
            return Err("worker_unavailable");
        }
        inner.active = true;
        Ok(ComputeAdmission {
            pool: Arc::clone(self),
        })
    }

    pub(crate) fn reserve(self: &Arc<Self>) -> Result<ComputeReservation, &'static str> {
        let mut inner = self.inner.lock().map_err(|_| "worker_unavailable")?;
        if inner.degraded || inner.stopping {
            return Err("worker_unavailable");
        }
        if inner.active {
            if inner.queued >= 2 {
                return Err("worker_busy");
            }
            inner.queued += 1;
            Ok(ComputeReservation {
                pool: Arc::clone(self),
                acquired: false,
                queued: true,
            })
        } else {
            inner.active = true;
            Ok(ComputeReservation {
                pool: Arc::clone(self),
                acquired: true,
                queued: false,
            })
        }
    }

    pub(crate) fn run_direct(
        &self,
        operation: WorkerOperation,
        request: Value,
    ) -> Result<Value, String> {
        #[cfg(test)]
        if self.executable == std::env::current_exe().unwrap_or_default()
            && matches!(
                operation,
                WorkerOperation::CitationGraphBuild
                    | WorkerOperation::CitationGraphLayout
                    | WorkerOperation::CitationGraphMetrics
            )
        {
            let canceled = AtomicBool::new(false);
            let result = match operation {
                WorkerOperation::CitationGraphBuild => {
                    synthesis_citation_graph_build::compute(request.clone(), &canceled)
                }
                WorkerOperation::CitationGraphLayout => {
                    synthesis_citation_layout::compute_value(request.clone(), &canceled)
                }
                WorkerOperation::CitationGraphMetrics => serde_json::from_value(request.clone())
                    .map_err(|_| "invalid_request")
                    .and_then(|request| {
                        synthesis_metrics::compute(request, &canceled).and_then(|result| {
                            serde_json::to_value(result).map_err(|_| "invalid_request")
                        })
                    }),
                _ => unreachable!(),
            }
            .map_err(str::to_owned)?;
            validate_direct_result(operation, &request, &result)?;
            return Ok(result);
        }
        let accepted_request = request.clone();
        let task_id = self.task_id();
        let deadline = Instant::now() + bounded_timeout(operation.direct_deadline())?;
        let result = self.with_worker(|worker| {
            worker.send(&json!({
                "protocol":WORKER_PROTOCOL,
                "type":"run",
                "taskId":task_id,
                "operation":operation.protocol_name(),
                "payload":request,
            }))?;
            let frame = worker.recv_frame(deadline, Some(&self.stop_requested), None)?;
            if frame["taskId"] != task_id {
                return Err("worker_result_invalid".to_owned());
            }
            match frame["type"].as_str() {
                Some("result") => {
                    let result = frame["result"].clone();
                    validate_direct_result(operation, &accepted_request, &result)?;
                    Ok(result)
                }
                Some("canceled") => Err("worker_canceled".to_owned()),
                Some("error") => Err(frame["code"]
                    .as_str()
                    .unwrap_or("worker_result_invalid")
                    .to_owned()),
                _ => Err("worker_result_invalid".to_owned()),
            }
        });
        self.finish_runtime_result(&result);
        result
    }

    pub(crate) fn run_paged(
        &self,
        operation: WorkerOperation,
        source: &mut dyn PagedInputSource,
        sink: &mut dyn PagedOutputSink,
        canceled: &AtomicBool,
    ) -> Result<Value, String> {
        let task_id = self.task_id();
        let operation_name = operation.protocol_name();
        let request_hash = source.request_hash().to_owned();
        let deadline = Instant::now() + TRANSFER_DEADLINE;
        let result = self.with_worker(|worker| {
            worker.send(&json!({
                "protocol":WORKER_PROTOCOL,
                "type":"run_begin",
                "taskId":task_id,
                "operation":operation_name,
                "requestHash":request_hash,
                "header":source.header()?,
            }))?;
            while let Some(page) = source.next_page()? {
                let rows: Value = serde_json::from_str(&page.raw_rows)
                    .map_err(|_| "worker_result_invalid".to_owned())?;
                let descriptor = json!({
                    "section":page.section,
                    "pageIndex":page.page_index,
                    "rowCount":page.row_count,
                    "byteLength":page.raw_rows.len(),
                    "sha256":canonical_sha256(&rows)
                        .map_err(|_| "worker_result_invalid".to_owned())?,
                });
                worker.send(&json!({
                    "protocol":WORKER_PROTOCOL,
                    "type":"input_page",
                    "taskId":task_id,
                    "descriptor":descriptor,
                    "rows":rows,
                }))?;
                let ack =
                    worker.recv_frame(deadline, Some(&self.stop_requested), Some(canceled))?;
                if ack["type"] != "input_ack"
                    || ack["taskId"] != task_id
                    || ack["section"] != page.section
                    || ack["pageIndex"] != page.page_index
                {
                    return Err("worker_result_invalid".to_owned());
                }
            }
            worker.send(&json!({
                "protocol":WORKER_PROTOCOL,
                "type":"input_complete",
                "taskId":task_id,
            }))?;
            let begin = worker.recv_frame(deadline, Some(&self.stop_requested), Some(canceled))?;
            if begin["type"] != "result_begin"
                || begin["taskId"] != task_id
                || begin["operation"] != operation_name
                || begin["requestHash"] != request_hash
            {
                return Err(frame_error(&begin));
            }
            let header = begin["header"]
                .as_object()
                .cloned()
                .ok_or_else(|| "worker_result_invalid".to_owned())?;
            sink.begin(header)?;
            loop {
                let frame =
                    worker.recv_frame(deadline, Some(&self.stop_requested), Some(canceled))?;
                if frame["taskId"] != task_id {
                    return Err("worker_result_invalid".to_owned());
                }
                match frame["type"].as_str() {
                    Some("result_page") => {
                        let descriptor = frame["descriptor"]
                            .as_object()
                            .ok_or_else(|| "worker_result_invalid".to_owned())?;
                        let section = descriptor["section"]
                            .as_str()
                            .ok_or_else(|| "worker_result_invalid".to_owned())?
                            .to_owned();
                        let page_index = descriptor["pageIndex"]
                            .as_u64()
                            .ok_or_else(|| "worker_result_invalid".to_owned())?;
                        let rows = frame["rows"]
                            .as_array()
                            .cloned()
                            .ok_or_else(|| "worker_result_invalid".to_owned())?;
                        let canonical = canonical_json(&Value::Array(rows.clone()))
                            .map_err(|_| "worker_result_invalid".to_owned())?;
                        if descriptor["rowCount"].as_u64() != Some(rows.len() as u64)
                            || descriptor["byteLength"].as_u64() != Some(canonical.len() as u64)
                            || descriptor["sha256"]
                                != canonical_sha256(&Value::Array(rows.clone()))
                                    .map_err(|_| "worker_result_invalid".to_owned())?
                            || count_json_nodes(&Value::Array(rows.clone())).is_err()
                        {
                            return Err("worker_result_invalid".to_owned());
                        }
                        sink.stage_page(PagedOutputFrame {
                            section: section.clone(),
                            page_index,
                            rows,
                        })?;
                        worker.send(&json!({
                            "protocol":WORKER_PROTOCOL,
                            "type":"result_ack",
                            "taskId":task_id,
                            "section":section,
                            "pageIndex":page_index,
                        }))?;
                    }
                    Some("result_complete")
                        if frame["operation"] == operation_name
                            && frame["requestHash"] == request_hash =>
                    {
                        return sink.commit();
                    }
                    Some("canceled") => return Err("worker_canceled".to_owned()),
                    Some("error") => return Err(frame_error(&frame)),
                    _ => return Err("worker_result_invalid".to_owned()),
                }
            }
        });
        if result.is_err() {
            sink.rollback();
        }
        if result.as_ref().is_err_and(|code| code == "worker_canceled") {
            self.discard_worker();
        }
        self.finish_runtime_result(&result);
        result
    }

    fn task_id(&self) -> String {
        format!(
            "native:{}",
            self.next_task_id.fetch_add(1, Ordering::Relaxed)
        )
    }

    fn with_worker<T>(
        &self,
        operation: impl FnOnce(&mut WorkerChild) -> Result<T, String>,
    ) -> Result<T, String> {
        let mut worker = self
            .worker
            .lock()
            .map_err(|_| "worker_unavailable".to_owned())?;
        if worker.is_none() {
            *worker = Some(WorkerChild::spawn(&self.executable)?);
        }
        let result = operation(worker.as_mut().expect("worker initialized"));
        if result.as_ref().is_err_and(|code| runtime_fault(code))
            && let Some(mut child) = worker.take()
        {
            child.terminate();
        }
        result
    }

    fn discard_worker(&self) {
        if let Ok(mut worker) = self.worker.lock()
            && let Some(mut child) = worker.take()
        {
            child.terminate();
        }
    }

    fn finish_runtime_result<T>(&self, result: &Result<T, String>) {
        match result {
            Ok(_) => self.record_success(),
            Err(code) if runtime_fault(code) => self.record_failure(),
            Err(_) => {}
        }
    }

    pub(crate) fn record_success(&self) {
        if let Ok(mut inner) = self.inner.lock() {
            inner.failure_count = 0;
        }
    }

    pub(crate) fn record_failure(&self) {
        if let Ok(mut inner) = self.inner.lock() {
            inner.restart_count += 1;
            inner.failure_count = inner.failure_count.saturating_add(1);
            inner.degraded = inner.failure_count >= 3;
            self.available.notify_all();
        }
    }

    pub(crate) fn stop(&self) {
        self.stop_requested.store(true, Ordering::Release);
        if let Ok(mut inner) = self.inner.lock() {
            inner.stopping = true;
            self.available.notify_all();
        }
        if let Ok(mut worker) = self.worker.lock()
            && let Some(mut child) = worker.take()
        {
            child.terminate();
        }
    }

    pub(crate) fn snapshot(&self, stopping: bool) -> Result<Value, String> {
        let inner = self
            .inner
            .lock()
            .map_err(|_| "worker_unavailable".to_owned())?;
        Ok(json!({
            "state":if stopping || inner.stopping {"stopping"} else if inner.degraded {"degraded"} else if inner.active {"busy"} else {"idle"},
            "active":if inner.active {1} else {0},
            "queued":inner.queued,
            "restartCount":inner.restart_count,
            "failureCount":inner.failure_count,
        }))
    }

    #[cfg(test)]
    pub(crate) fn child_id(&self) -> Option<u32> {
        self.worker
            .lock()
            .ok()
            .and_then(|worker| worker.as_ref().map(|worker| worker.child.id()))
    }
}

impl Drop for ComputeAdmission {
    fn drop(&mut self) {
        if let Ok(mut inner) = self.pool.inner.lock() {
            inner.active = false;
            self.pool.available.notify_one();
        }
    }
}

impl ComputeReservation {
    pub(crate) fn wait(
        &mut self,
        stopping: &AtomicBool,
        canceled: &AtomicBool,
    ) -> Result<(), &'static str> {
        if self.acquired {
            return Ok(());
        }
        let mut inner = self.pool.inner.lock().map_err(|_| "worker_unavailable")?;
        while inner.active
            && !inner.degraded
            && !inner.stopping
            && !stopping.load(Ordering::Acquire)
            && !canceled.load(Ordering::Acquire)
        {
            let (next, _) = self
                .pool
                .available
                .wait_timeout(inner, Duration::from_millis(10))
                .map_err(|_| "worker_unavailable")?;
            inner = next;
        }
        if self.queued {
            inner.queued = inner.queued.saturating_sub(1);
            self.queued = false;
        }
        if canceled.load(Ordering::Acquire) || stopping.load(Ordering::Acquire) || inner.stopping {
            return Err("worker_canceled");
        }
        if inner.degraded {
            return Err("worker_unavailable");
        }
        inner.active = true;
        self.acquired = true;
        Ok(())
    }
}

impl Drop for ComputeReservation {
    fn drop(&mut self) {
        if let Ok(mut inner) = self.pool.inner.lock() {
            if self.queued {
                inner.queued = inner.queued.saturating_sub(1);
            }
            if self.acquired {
                inner.active = false;
                self.pool.available.notify_one();
            }
        }
    }
}

fn runtime_fault(code: &str) -> bool {
    matches!(
        code,
        "worker_unavailable"
            | "worker_crashed"
            | "worker_timeout"
            | "worker_result_invalid"
            | "transfer_sink_failed"
    )
}

fn frame_error(frame: &Value) -> String {
    frame["code"]
        .as_str()
        .unwrap_or("worker_result_invalid")
        .to_owned()
}

fn validate_direct_result(
    operation: WorkerOperation,
    request: &Value,
    result: &Value,
) -> Result<(), String> {
    let fields: &[&str] = match operation {
        WorkerOperation::CitationGraphLayout => &[
            "graphHash",
            "algorithm",
            "layoutEngine",
            "layoutVersion",
            "params",
            "nodes",
        ],
        WorkerOperation::CitationGraphMetrics => &[
            "graphHash",
            "metricsVersion",
            "params",
            "graphYear",
            "libraryNodeMetrics",
            "diagnostics",
        ],
        WorkerOperation::CitationGraphBuild => &[
            "contractVersion",
            "scope",
            "nodes",
            "resolvedEdges",
            "aggregateEdges",
            "sourceOwnership",
            "incomingGroups",
            "lightMetrics",
            "diagnostics",
        ],
        WorkerOperation::TagVocabularyValidate => {
            &["contractVersion", "algorithmVersion", "warnings"]
        }
        WorkerOperation::TagVocabularyIndex => &[
            "contractVersion",
            "algorithmVersion",
            "schemaVersion",
            "sourceManifestHash",
            "rebuiltAt",
            "tags",
            "aliases",
            "abbrev",
        ],
        WorkerOperation::ConceptKbIndex => &[
            "contractVersion",
            "algorithmVersion",
            "schemaVersion",
            "sourceManifestHash",
            "rebuiltAt",
            "search",
            "overlayEntries",
        ],
        WorkerOperation::ConceptKbQuery => &["contractVersion", "algorithmVersion", "matches"],
        WorkerOperation::TopicGraphIndex => &[
            "contractVersion",
            "algorithmVersion",
            "schemaVersion",
            "sourceManifestHash",
            "rebuiltAt",
            "roots",
            "unplaced",
        ],
        WorkerOperation::ReferenceBinding => {
            &["contractVersion", "algorithmVersion", "policyId", "matches"]
        }
        WorkerOperation::ReferenceCanonicalDedupe => &[
            "contractVersion",
            "algorithmVersion",
            "counters",
            "clusters",
            "edges",
            "actions",
            "diagnostics",
        ],
        WorkerOperation::TopicManifestValidate
        | WorkerOperation::TopicArtifactAssemble
        | WorkerOperation::TopicArtifactValidate
        | WorkerOperation::TopicSectionPatch
        | WorkerOperation::CitationGraphBuildTransfer => {
            return Ok(());
        }
    };
    let object = result
        .as_object()
        .filter(|object| {
            object.len() == fields.len() && fields.iter().all(|field| object.contains_key(*field))
        })
        .ok_or_else(|| "worker_result_invalid".to_owned())?;
    match operation {
        WorkerOperation::CitationGraphLayout => {
            if result["graphHash"] != request["graphHash"]
                || result["algorithm"] != request["algorithm"]
                || !result["params"].is_object()
                || result["nodes"].as_array().is_none_or(|nodes| {
                    nodes.len() != request["nodes"].as_array().map_or(0, Vec::len)
                        || nodes.iter().any(|node| {
                            let Some(node) = node.as_object() else {
                                return true;
                            };
                            node.len() != 3
                                || !node.contains_key("nodeId")
                                || node["nodeId"].as_str().is_none()
                                || node["x"].as_f64().is_none_or(|value| !value.is_finite())
                                || node["y"].as_f64().is_none_or(|value| !value.is_finite())
                        })
                })
            {
                return Err("worker_result_invalid".to_owned());
            }
        }
        WorkerOperation::CitationGraphMetrics => {
            let result: MetricsResult = serde_json::from_value(Value::Object(object.clone()))
                .map_err(|_| "worker_result_invalid".to_owned())?;
            if result.graph_hash != request["graphHash"].as_str().unwrap_or_default() {
                return Err("worker_result_invalid".to_owned());
            }
        }
        WorkerOperation::CitationGraphBuild => {
            if result["contractVersion"] != request["contractVersion"]
                || result["scope"] != request["scope"]
                || !result["diagnostics"].is_object()
                || fields[2..8].iter().any(|field| !result[*field].is_array())
            {
                return Err("worker_result_invalid".to_owned());
            }
        }
        WorkerOperation::TagVocabularyValidate
        | WorkerOperation::TagVocabularyIndex
        | WorkerOperation::ConceptKbIndex
        | WorkerOperation::ConceptKbQuery
        | WorkerOperation::TopicGraphIndex
        | WorkerOperation::ReferenceBinding
        | WorkerOperation::ReferenceCanonicalDedupe => {
            if result["contractVersion"] != request["contractVersion"]
                || result["algorithmVersion"] != request["algorithmVersion"]
            {
                return Err("worker_result_invalid".to_owned());
            }
        }
        WorkerOperation::TopicManifestValidate
        | WorkerOperation::TopicArtifactAssemble
        | WorkerOperation::TopicArtifactValidate
        | WorkerOperation::TopicSectionPatch
        | WorkerOperation::CitationGraphBuildTransfer => unreachable!(),
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn configured_pool_remains_lazy_until_admission_runs() {
        let pool = NativeComputePool::new_with_executable(PathBuf::from("unused-worker"));
        assert_eq!(pool.child_id(), None);
        assert_eq!(pool.snapshot(false).expect("snapshot")["state"], "idle");
    }

    #[test]
    fn layout_has_an_operation_specific_direct_deadline() {
        assert_eq!(
            WorkerOperation::CitationGraphLayout.direct_deadline(),
            Duration::from_secs(10)
        );
        assert_eq!(
            WorkerOperation::CitationGraphMetrics.direct_deadline(),
            Duration::from_secs(5)
        );
        assert_eq!(
            WorkerOperation::CitationGraphBuild.direct_deadline(),
            Duration::from_secs(5)
        );
    }

    #[test]
    fn reservations_are_nonblocking_bounded_and_cancelable() {
        let pool = Arc::new(NativeComputePool::new());
        let first = pool.reserve().expect("active reservation");
        let mut canceled_reservation = pool.reserve().expect("first queued");
        let mut next = pool.reserve().expect("second queued");
        assert!(matches!(pool.reserve(), Err("worker_busy")));
        assert_eq!(pool.snapshot(false).expect("snapshot")["queued"], 2);

        let stopping = AtomicBool::new(false);
        let canceled = AtomicBool::new(true);
        assert_eq!(
            canceled_reservation.wait(&stopping, &canceled),
            Err("worker_canceled")
        );
        drop(canceled_reservation);
        assert_eq!(pool.snapshot(false).expect("snapshot")["queued"], 1);

        drop(first);
        next.wait(&stopping, &AtomicBool::new(false))
            .expect("queued reservation activates");
        assert_eq!(pool.snapshot(false).expect("snapshot")["active"], 1);
    }
}
