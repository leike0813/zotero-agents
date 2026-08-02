use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::cell::RefCell;
use std::collections::BTreeMap;
use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use synthesis_sidecar::runtime_contract::current_time_ms;

static DEBUG_EVENTS_ENABLED: AtomicBool = AtomicBool::new(false);
static OBSERVATION_SEQUENCE: AtomicU64 = AtomicU64::new(0);

thread_local! {
    static OBSERVATION_CONTEXT: RefCell<Option<TraceContext>> = const { RefCell::new(None) };
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub(crate) struct TraceContext {
    schema: String,
    trace_id: String,
    span_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_span_id: Option<String>,
    attempt: u64,
}

impl TraceContext {
    pub(crate) fn is_valid(&self) -> bool {
        self.schema == "synthesis-sidecar-observation.v2"
            && valid_hex(&self.trace_id, 32)
            && valid_hex(&self.span_id, 16)
            && self
                .parent_span_id
                .as_ref()
                .is_none_or(|value| valid_hex(value, 16))
    }
}

fn valid_hex(value: &str, length: usize) -> bool {
    value.len() == length
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
}

fn next_hex(length: usize) -> String {
    let sequence = OBSERVATION_SEQUENCE.fetch_add(1, Ordering::Relaxed) + 1;
    let time = current_time_ms().unwrap_or_default();
    let source = format!("{time:016x}{sequence:016x}");
    source[source.len().saturating_sub(length)..].to_owned()
}

fn current_child_context() -> TraceContext {
    OBSERVATION_CONTEXT.with(|current| {
        if let Some(parent) = current.borrow().as_ref() {
            TraceContext {
                schema: "synthesis-sidecar-observation.v2".to_owned(),
                trace_id: parent.trace_id.clone(),
                span_id: next_hex(16),
                parent_span_id: Some(parent.span_id.clone()),
                attempt: parent.attempt,
            }
        } else {
            TraceContext {
                schema: "synthesis-sidecar-observation.v2".to_owned(),
                trace_id: next_hex(32),
                span_id: next_hex(16),
                parent_span_id: None,
                attempt: 0,
            }
        }
    })
}

pub(crate) fn child_observation_context() -> Option<TraceContext> {
    debug_events_enabled().then(current_child_context)
}

pub(crate) fn with_observation_context<T>(
    context: Option<&TraceContext>,
    operation: impl FnOnce() -> T,
) -> T {
    OBSERVATION_CONTEXT.with(|current| {
        let previous = current.replace(context.cloned());
        let result = operation();
        current.replace(previous);
        result
    })
}

fn map_is_empty(value: &BTreeMap<&'static str, Value>) -> bool {
    value.is_empty()
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NativeDiagnosticEvent {
    schema: &'static str,
    trace_id: String,
    span_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    parent_span_id: Option<String>,
    attempt: u64,
    source: &'static str,
    boundary: &'static str,
    phase: &'static str,
    outcome: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<String>,
    occurred_at_ms: u64,
    #[serde(skip_serializing_if = "map_is_empty")]
    identities: BTreeMap<&'static str, Value>,
    #[serde(skip_serializing_if = "map_is_empty")]
    metrics: BTreeMap<&'static str, Value>,
    #[serde(skip_serializing_if = "map_is_empty")]
    facts: BTreeMap<&'static str, Value>,
}

impl NativeDiagnosticEvent {
    pub(crate) fn new(component: &'static str, phase: &'static str, status: &'static str) -> Self {
        let context = current_child_context();
        let boundary = match component {
            "lifecycle" => "supervisor",
            "rpc" => "host-rpc",
            "reverse-host" => "reverse-host",
            "worker" => "child-worker",
            "batch" => "transfer",
            "process" => "process",
            _ => "operation",
        };
        let source = if boundary == "child-worker" {
            "child-worker"
        } else {
            "rust-sidecar"
        };
        let outcome = match status {
            "started" => "started",
            "succeeded" => "succeeded",
            "canceled" => "canceled",
            "timed-out" => "timed-out",
            _ => "failed",
        };
        Self {
            schema: "synthesis-sidecar-observation.v2",
            trace_id: context.trace_id,
            span_id: context.span_id,
            parent_span_id: context.parent_span_id,
            attempt: context.attempt,
            source,
            boundary,
            phase,
            outcome,
            code: None,
            occurred_at_ms: current_time_ms().unwrap_or_default(),
            identities: BTreeMap::new(),
            metrics: BTreeMap::new(),
            facts: BTreeMap::new(),
        }
    }

    pub(crate) fn capability(mut self, value: impl Into<String>) -> Self {
        self.identities.insert("capability", json!(value.into()));
        self
    }

    pub(crate) fn request_id(self, _value: impl Into<String>) -> Self {
        self
    }

    pub(crate) fn operation_id(mut self, value: impl Into<String>) -> Self {
        self.identities.insert("operation", json!(value.into()));
        self
    }

    pub(crate) fn correlation_id(self, _value: impl Into<String>) -> Self {
        self
    }

    pub(crate) fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub(crate) fn mutation_status(mut self, value: impl Into<String>) -> Self {
        self.facts.insert("semanticStatus", json!(value.into()));
        self
    }

    pub(crate) fn worker_code(mut self, value: impl Into<String>) -> Self {
        if self.code.is_none() {
            self.code = Some(value.into());
        }
        self
    }

    pub(crate) fn algorithm(mut self, value: impl Into<String>) -> Self {
        self.facts.insert("algorithm", json!(value.into()));
        self
    }

    pub(crate) fn graph_hash(mut self, value: impl Into<String>) -> Self {
        self.facts.insert("graphHash", json!(value.into()));
        self
    }

    pub(crate) fn matching_hash(mut self, value: impl Into<String>) -> Self {
        self.facts.insert("matchingHash", json!(value.into()));
        self
    }

    pub(crate) fn proposal_created_count(mut self, value: usize) -> Self {
        self.facts.insert("proposalCount", json!(value));
        self
    }

    pub(crate) fn fact_count(mut self, value: usize) -> Self {
        self.facts.insert("factCount", json!(value));
        self
    }

    pub(crate) fn warning_count(mut self, value: usize) -> Self {
        self.facts.insert("warningCount", json!(value));
        self
    }

    pub(crate) fn duration_ms(mut self, value: u64) -> Self {
        self.metrics.insert("durationMs", json!(value));
        self
    }

    pub(crate) fn queue_wait_ms(mut self, value: u64) -> Self {
        self.metrics.insert("queueWaitMs", json!(value));
        self
    }

    pub(crate) fn request_bytes(mut self, value: usize) -> Self {
        self.metrics.insert("requestBytes", json!(value));
        self
    }

    pub(crate) fn response_bytes(mut self, value: usize) -> Self {
        self.metrics.insert("responseBytes", json!(value));
        self
    }

    pub(crate) fn sql_query_count(mut self, value: u64) -> Self {
        self.metrics.insert("sqlQueryCount", json!(value));
        self
    }

    pub(crate) fn http_status(self, _value: u16) -> Self {
        self
    }

    pub(crate) fn returned(mut self, value: usize) -> Self {
        self.metrics.insert("returnedCount", json!(value));
        self
    }

    pub(crate) fn total(mut self, value: usize) -> Self {
        self.metrics.insert("totalCount", json!(value));
        self
    }

    pub(crate) fn page(mut self, value: usize) -> Self {
        self.metrics.insert("batchOrdinal", json!(value));
        self
    }

    pub(crate) fn batch_ordinal(mut self, value: usize) -> Self {
        self.metrics.insert("batchOrdinal", json!(value));
        self
    }

    pub(crate) fn source_count(mut self, value: usize) -> Self {
        self.metrics.insert("totalCount", json!(value));
        self
    }

    pub(crate) fn payload_count(mut self, value: usize) -> Self {
        self.metrics.insert("returnedCount", json!(value));
        self
    }

    pub(crate) fn actual_bytes(mut self, value: usize) -> Self {
        self.metrics.insert("responseBytes", json!(value));
        self
    }

    pub(crate) fn limit_bytes(mut self, value: usize) -> Self {
        self.metrics.insert("budgetBytes", json!(value));
        self
    }

    pub(crate) fn actual_json_nodes(self, _value: usize) -> Self {
        self
    }

    pub(crate) fn limit_json_nodes(self, _value: usize) -> Self {
        self
    }

    pub(crate) fn node_count(mut self, value: usize) -> Self {
        self.facts.insert("nodeCount", json!(value));
        self
    }

    pub(crate) fn edge_count(mut self, value: usize) -> Self {
        self.facts.insert("edgeCount", json!(value));
        self
    }

    pub(crate) fn node_limit(self, _value: usize) -> Self {
        self
    }

    pub(crate) fn edge_limit(self, _value: usize) -> Self {
        self
    }
}

pub(crate) fn emit(event: NativeDiagnosticEvent) {
    if !debug_events_enabled() {
        return;
    }
    if let Ok(source) = serde_json::to_string(&event) {
        eprintln!("{source}");
    }
}

pub(crate) fn configure_debug_events(enabled: bool) {
    DEBUG_EVENTS_ENABLED.store(enabled, Ordering::Release);
}

pub(crate) fn debug_events_enabled() -> bool {
    DEBUG_EVENTS_ENABLED.load(Ordering::Acquire)
}

pub(crate) fn correlate(event: NativeDiagnosticEvent) -> NativeDiagnosticEvent {
    event
}

pub(crate) fn emit_debug(build: impl FnOnce() -> NativeDiagnosticEvent) {
    if debug_events_enabled() {
        emit(build());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicUsize;

    #[test]
    fn diagnostic_event_serializes_the_strict_v2_allowlist_and_zero_values() {
        configure_debug_events(true);
        let event = NativeDiagnosticEvent::new("reverse-host", "terminal", "failed")
            .capability("library.artifacts.read")
            .request_id("request-1")
            .operation_id("advanced_reference_matching")
            .code("reverse_host_response_body_truncated")
            .mutation_status("invalid_request")
            .worker_code("invalid_request")
            .algorithm("force")
            .graph_hash(format!("sha256:{}", "a".repeat(64)))
            .matching_hash(format!("sha256:{}", "b".repeat(64)))
            .proposal_created_count(0)
            .fact_count(2)
            .warning_count(0)
            .duration_ms(0)
            .request_bytes(10)
            .response_bytes(20)
            .sql_query_count(0)
            .http_status(200)
            .returned(1)
            .total(2)
            .page(0)
            .node_count(7_432)
            .edge_count(11_377)
            .node_limit(20_000)
            .edge_limit(80_000);
        let source = serde_json::to_string(&event).expect("diagnostic event");
        assert!(source.contains("synthesis-sidecar-observation.v2"));
        assert!(source.contains("\"proposalCount\":0"));
        assert!(source.contains("\"durationMs\":0"));
        assert!(source.contains("\"sqlQueryCount\":0"));
        for forbidden in [
            "payload",
            "authorization",
            "token",
            "locator",
            "paperRef",
            "requestId",
            "httpStatus",
            "workerCode",
        ] {
            assert!(!source.contains(forbidden));
        }
    }

    #[test]
    fn trace_context_rejects_unknown_fields_and_invalid_ids() {
        let valid: TraceContext = serde_json::from_value(json!({
            "schema":"synthesis-sidecar-observation.v2",
            "traceId":"1".repeat(32),
            "spanId":"2".repeat(16),
            "attempt":0
        }))
        .expect("valid context");
        assert!(valid.is_valid());
        assert!(
            serde_json::from_value::<TraceContext>(json!({
                "schema":"synthesis-sidecar-observation.v2",
                "traceId":"1".repeat(32),
                "spanId":"2".repeat(16),
                "attempt":0,
                "payload":{}
            }))
            .is_err()
        );
    }

    #[test]
    fn disabled_debug_events_do_not_construct_event_payloads() {
        let constructed = AtomicUsize::new(0);
        configure_debug_events(false);
        emit_debug(|| {
            constructed.fetch_add(1, Ordering::Relaxed);
            NativeDiagnosticEvent::new("process", "line-received", "succeeded")
        });
        assert_eq!(constructed.load(Ordering::Relaxed), 0);
    }
}
