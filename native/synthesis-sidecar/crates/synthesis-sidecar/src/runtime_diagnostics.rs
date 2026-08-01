use serde::Serialize;
use std::sync::atomic::{AtomicBool, Ordering};
use synthesis_sidecar::runtime_contract::current_time_ms;

static DEBUG_EVENTS_ENABLED: AtomicBool = AtomicBool::new(false);

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NativeDiagnosticEvent {
    schema: &'static str,
    ts_ms: u64,
    component: &'static str,
    stage: &'static str,
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    capability: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    request_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    operation_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    correlation_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    mutation_status: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    worker_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    algorithm: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    graph_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    request_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    response_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    http_status: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    returned: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    total: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    page: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    batch_ordinal: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    payload_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    actual_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    limit_bytes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    actual_json_nodes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    limit_json_nodes: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    node_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    edge_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    node_limit: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    edge_limit: Option<u64>,
}

impl NativeDiagnosticEvent {
    pub(crate) fn new(component: &'static str, stage: &'static str, status: &'static str) -> Self {
        Self {
            schema: "synthesis-sidecar-native-diagnostic-event.v1",
            ts_ms: current_time_ms().unwrap_or_default(),
            component,
            stage,
            status,
            capability: None,
            request_id: None,
            operation_id: None,
            correlation_id: crate::runtime_deadline::current_request_correlation_id(),
            code: None,
            mutation_status: None,
            worker_code: None,
            algorithm: None,
            graph_hash: None,
            duration_ms: None,
            request_bytes: None,
            response_bytes: None,
            http_status: None,
            returned: None,
            total: None,
            page: None,
            batch_ordinal: None,
            source_count: None,
            payload_count: None,
            actual_bytes: None,
            limit_bytes: None,
            actual_json_nodes: None,
            limit_json_nodes: None,
            node_count: None,
            edge_count: None,
            node_limit: None,
            edge_limit: None,
        }
    }

    pub(crate) fn capability(mut self, value: impl Into<String>) -> Self {
        self.capability = Some(value.into());
        self
    }

    pub(crate) fn request_id(mut self, value: impl Into<String>) -> Self {
        self.request_id = Some(value.into());
        self
    }

    pub(crate) fn operation_id(mut self, value: impl Into<String>) -> Self {
        self.operation_id = Some(value.into());
        self
    }

    pub(crate) fn correlation_id(mut self, value: impl Into<String>) -> Self {
        self.correlation_id = Some(value.into());
        self
    }

    pub(crate) fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
        self
    }

    pub(crate) fn mutation_status(mut self, value: impl Into<String>) -> Self {
        self.mutation_status = Some(value.into());
        self
    }

    pub(crate) fn worker_code(mut self, value: impl Into<String>) -> Self {
        self.worker_code = Some(value.into());
        self
    }

    pub(crate) fn algorithm(mut self, value: impl Into<String>) -> Self {
        self.algorithm = Some(value.into());
        self
    }

    pub(crate) fn graph_hash(mut self, value: impl Into<String>) -> Self {
        self.graph_hash = Some(value.into());
        self
    }

    pub(crate) fn duration_ms(mut self, value: u64) -> Self {
        self.duration_ms = Some(value);
        self
    }

    pub(crate) fn request_bytes(mut self, value: usize) -> Self {
        self.request_bytes = Some(value as u64);
        self
    }

    pub(crate) fn response_bytes(mut self, value: usize) -> Self {
        self.response_bytes = Some(value as u64);
        self
    }

    pub(crate) fn http_status(mut self, value: u16) -> Self {
        self.http_status = Some(value);
        self
    }

    pub(crate) fn returned(mut self, value: usize) -> Self {
        self.returned = Some(value as u64);
        self
    }

    pub(crate) fn total(mut self, value: usize) -> Self {
        self.total = Some(value as u64);
        self
    }

    pub(crate) fn page(mut self, value: usize) -> Self {
        self.page = Some(value as u64);
        self
    }

    pub(crate) fn batch_ordinal(mut self, value: usize) -> Self {
        self.batch_ordinal = Some(value as u64);
        self
    }

    pub(crate) fn source_count(mut self, value: usize) -> Self {
        self.source_count = Some(value as u64);
        self
    }

    pub(crate) fn payload_count(mut self, value: usize) -> Self {
        self.payload_count = Some(value as u64);
        self
    }

    pub(crate) fn actual_bytes(mut self, value: usize) -> Self {
        self.actual_bytes = Some(value as u64);
        self
    }

    pub(crate) fn limit_bytes(mut self, value: usize) -> Self {
        self.limit_bytes = Some(value as u64);
        self
    }

    pub(crate) fn actual_json_nodes(mut self, value: usize) -> Self {
        self.actual_json_nodes = Some(value as u64);
        self
    }

    pub(crate) fn limit_json_nodes(mut self, value: usize) -> Self {
        self.limit_json_nodes = Some(value as u64);
        self
    }

    pub(crate) fn node_count(mut self, value: usize) -> Self {
        self.node_count = Some(value as u64);
        self
    }

    pub(crate) fn edge_count(mut self, value: usize) -> Self {
        self.edge_count = Some(value as u64);
        self
    }

    pub(crate) fn node_limit(mut self, value: usize) -> Self {
        self.node_limit = Some(value as u64);
        self
    }

    pub(crate) fn edge_limit(mut self, value: usize) -> Self {
        self.edge_limit = Some(value as u64);
        self
    }
}

pub(crate) fn emit(event: NativeDiagnosticEvent) {
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
    match crate::runtime_deadline::current_request_correlation_id() {
        Some(correlation_id) => event.correlation_id(correlation_id),
        None => event,
    }
}

pub(crate) fn emit_debug(build: impl FnOnce() -> NativeDiagnosticEvent) {
    if DEBUG_EVENTS_ENABLED.load(Ordering::Acquire) {
        emit(build());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::AtomicUsize;

    #[test]
    fn diagnostic_event_has_only_bounded_metadata_fields() {
        let event = NativeDiagnosticEvent::new("reverse-host", "call-failed", "failed")
            .capability("library.artifacts.read")
            .request_id("request-1")
            .operation_id("operation-1")
            .code("reverse_host_response_body_truncated")
            .mutation_status("invalid_request")
            .worker_code("invalid_request")
            .algorithm("force")
            .graph_hash(format!("sha256:{}", "a".repeat(64)))
            .duration_ms(4)
            .request_bytes(10)
            .response_bytes(20)
            .http_status(200)
            .returned(1)
            .total(2)
            .page(0)
            .node_count(7_432)
            .edge_count(11_377)
            .node_limit(20_000)
            .edge_limit(80_000);
        let source = serde_json::to_string(&event).expect("diagnostic event");
        assert!(source.contains("synthesis-sidecar-native-diagnostic-event.v1"));
        for forbidden in ["payload", "authorization", "token", "locator", "paperRef"] {
            assert!(!source.contains(forbidden));
        }
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
