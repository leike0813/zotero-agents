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
    code: Option<String>,
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
            code: None,
            duration_ms: None,
            request_bytes: None,
            response_bytes: None,
            http_status: None,
            returned: None,
            total: None,
            page: None,
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

    pub(crate) fn code(mut self, value: impl Into<String>) -> Self {
        self.code = Some(value.into());
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
}

pub(crate) fn emit(event: NativeDiagnosticEvent) {
    if let Ok(source) = serde_json::to_string(&event) {
        eprintln!("{source}");
    }
}

pub(crate) fn configure_debug_events(enabled: bool) {
    DEBUG_EVENTS_ENABLED.store(enabled, Ordering::Release);
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
            .duration_ms(4)
            .request_bytes(10)
            .response_bytes(20)
            .http_status(200)
            .returned(1)
            .total(2)
            .page(0);
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
