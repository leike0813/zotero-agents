use serde_json::json;
use std::collections::BTreeMap;
use std::io::{self, Read};
use std::net::{Shutdown, TcpListener, TcpStream};
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};
use synthesis_sidecar::runtime_contract::{SIDECAR_CAPABILITIES, current_time_ms};

use crate::runtime_capabilities::{ServeState, error_response, handle_connection};
use crate::runtime_diagnostics::{NativeDiagnosticEvent, emit_debug};
use crate::runtime_http::{configure_http_stream, response};

const MAX_ACTIVE_HTTP_CONNECTIONS: usize = 16;
const HTTP_HANDLER_DRAIN_TIMEOUT: Duration = Duration::from_millis(500);

#[derive(Default)]
struct ActiveConnectionState {
    next_id: u64,
    sockets: BTreeMap<u64, TcpStream>,
}

#[derive(Default)]
struct ActiveConnections {
    state: Mutex<ActiveConnectionState>,
}

struct ActiveConnectionLease {
    id: u64,
    owner: Arc<ActiveConnections>,
}

impl ActiveConnections {
    fn admit(
        self: &Arc<Self>,
        stream: &TcpStream,
    ) -> Result<Option<ActiveConnectionLease>, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "http_connection_owner_unavailable".to_owned())?;
        if state.sockets.len() >= MAX_ACTIVE_HTTP_CONNECTIONS {
            return Ok(None);
        }
        let id = state.next_id;
        state.next_id = state.next_id.wrapping_add(1);
        let socket = stream
            .try_clone()
            .map_err(|_| "http_connection_clone_failed".to_owned())?;
        state.sockets.insert(id, socket);
        Ok(Some(ActiveConnectionLease {
            id,
            owner: Arc::clone(self),
        }))
    }

    fn interrupt_all(&self) {
        if let Ok(state) = self.state.lock() {
            for socket in state.sockets.values() {
                let _ = socket.shutdown(Shutdown::Both);
            }
        }
    }

    #[cfg(test)]
    fn active(&self) -> usize {
        self.state
            .lock()
            .map(|state| state.sockets.len())
            .unwrap_or_default()
    }
}

impl Drop for ActiveConnectionLease {
    fn drop(&mut self) {
        if let Ok(mut state) = self.owner.state.lock() {
            state.sockets.remove(&self.id);
        }
    }
}

fn reap_finished_handlers(handlers: &mut Vec<JoinHandle<()>>, handler_panicked: &mut bool) {
    let mut index = 0;
    while index < handlers.len() {
        if handlers[index].is_finished() {
            let handler = handlers.swap_remove(index);
            if handler.join().is_err() {
                *handler_panicked = true;
            }
        } else {
            index += 1;
        }
    }
}

fn drain_handlers_until(
    handlers: &mut Vec<JoinHandle<()>>,
    handler_panicked: &mut bool,
    deadline: Instant,
) -> usize {
    loop {
        reap_finished_handlers(handlers, handler_panicked);
        if handlers.is_empty() || Instant::now() >= deadline {
            return handlers.len();
        }
        thread::sleep(Duration::from_millis(5));
    }
}

pub(crate) fn run_sidecar_listener(state: Arc<ServeState>) -> Result<(), String> {
    let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|error| error.to_string())?;
    listener
        .set_nonblocking(true)
        .map_err(|error| error.to_string())?;
    let port = listener
        .local_addr()
        .map_err(|error| error.to_string())?
        .port();
    let discovery = json!({
        "schema":"synthesis-sidecar-discovery.v5",
        "profileId":state.config.profile_id,
        "supervisorInstanceId":state.config.supervisor_instance_id,
        "serviceInstanceId":state.service_instance_id,
        "bundleId":state.config.bundle_id,
        "implementation":state.config.implementation,
        "target":state.config.target,
        "targetTriple":state.config.target_triple,
        "buildFingerprint":state.config.build_fingerprint,
        "platformSignature":state.config.platform_signature,
        "serviceVersion":state.config.service_version,
        "protocolVersion":state.config.protocol_version,
        "schemaVersion":state.config.schema_version,
        "runtimeRootId":state.config.runtime_root_id,
        "dataRootId":state.config.data_root_id,
        "host":"127.0.0.1",
        "port":port,
        "pid":std::process::id(),
        "lifecycleState":"ready",
        "tokenLocator":"supervisor-session",
        "capabilities":SIDECAR_CAPABILITIES,
    });
    state.runtime_ownership.publish_discovery(&discovery)?;
    println!(
        "{}",
        json!({"type":"listening","port":port,"buildFingerprint":state.config.build_fingerprint})
    );

    let stdin_stopping = Arc::clone(&state.stopping);
    thread::spawn(move || {
        let mut buffer = [0_u8; 1];
        while io::stdin().read(&mut buffer).is_ok_and(|size| size > 0) {}
        stdin_stopping.store(true, Ordering::Release);
    });

    let connections = Arc::new(ActiveConnections::default());
    let mut handlers = Vec::new();
    let mut handler_panicked = false;
    let mut next_transfer_reap_ms = current_time_ms()?.saturating_add(30_000);
    while !state.stopping.load(Ordering::Acquire) {
        reap_finished_handlers(&mut handlers, &mut handler_panicked);
        let background = state.background_tasks.reap_finished();
        if background.panicked > 0 {
            emit_debug(|| {
                NativeDiagnosticEvent::new("process", "background-task-panicked", "failed")
                    .warning_count(background.panicked)
            });
        }
        let now_ms = current_time_ms()?;
        if now_ms >= next_transfer_reap_ms {
            if let Ok(mut transfer) = state.transfer.lock() {
                transfer.reap(now_ms);
            }
            next_transfer_reap_ms = now_ms.saturating_add(30_000);
        }
        match listener.accept() {
            Ok((mut stream, _)) => {
                if let Err(error) = configure_http_stream(&stream) {
                    emit_debug(|| {
                        NativeDiagnosticEvent::new("process", "http-handler-failed", "failed")
                            .code(error)
                    });
                    continue;
                }
                if state.stopping.load(Ordering::Acquire) {
                    let _ = stream.shutdown(Shutdown::Both);
                    continue;
                }
                match connections.admit(&stream)? {
                    Some(lease) => {
                        let state = Arc::clone(&state);
                        handlers.push(thread::spawn(move || {
                            let _lease = lease;
                            if let Err(error) = handle_connection(stream, state) {
                                emit_debug(|| {
                                    NativeDiagnosticEvent::new(
                                        "process",
                                        "http-handler-failed",
                                        "failed",
                                    )
                                    .code(error)
                                });
                            }
                        }));
                    }
                    None => {
                        let _ = response(&mut stream, 503, error_response("service_unavailable"));
                    }
                }
            }
            Err(error) if error.kind() == io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(5));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
    drop(listener);
    connections.interrupt_all();

    let mut cleanup_errors = Vec::new();
    let cleanup_deadline = Instant::now() + HTTP_HANDLER_DRAIN_TIMEOUT;
    state.background_tasks.stop_admission();
    if let Err(error) = state.applications.canonical_autosync.shutdown() {
        cleanup_errors.push(error);
    }
    state.compute_pool.stop();
    match state.transfer.lock() {
        Ok(mut transfer) => transfer.request_stop(),
        Err(_) => cleanup_errors.push("transfer_owner_unavailable".to_owned()),
    }
    let background = state
        .background_tasks
        .stop_and_drain_until(cleanup_deadline);
    if background.panicked > 0 {
        cleanup_errors.push(format!("background_task_panicked:{}", background.panicked));
    }
    if background.remaining > 0 {
        cleanup_errors.push(format!(
            "background_task_drain_timeout:{}",
            background.remaining
        ));
    } else {
        match state.transfer.lock() {
            Ok(mut transfer) => transfer.finalize_stop(),
            Err(_) => cleanup_errors.push("transfer_owner_unavailable".to_owned()),
        }
    }
    let pending_handlers =
        drain_handlers_until(&mut handlers, &mut handler_panicked, cleanup_deadline);
    if handler_panicked {
        cleanup_errors.push("http_handler_panicked".to_owned());
    }
    if pending_handlers > 0 {
        cleanup_errors.push(format!("http_handler_drain_timeout:{pending_handlers}"));
    }
    drop(handlers);
    if let Err(error) = state
        .applications
        .webdav
        .shutdown(cleanup_deadline.saturating_duration_since(Instant::now()))
    {
        cleanup_errors.push(error);
    }
    let can_close_storage = background.remaining == 0 && pending_handlers == 0;
    if can_close_storage {
        match Arc::try_unwrap(state) {
            Ok(state) => {
                let repository = Arc::clone(&state.repository);
                let canonical = state.canonical.owner();
                drop(state);
                match Arc::try_unwrap(canonical) {
                    Ok(canonical) => match canonical.into_inner() {
                        Ok(canonical) => {
                            if let Err(error) = canonical.close() {
                                cleanup_errors.push(error);
                            }
                        }
                        Err(_) => cleanup_errors.push("canonical_store_unavailable".to_owned()),
                    },
                    Err(_) => cleanup_errors.push("canonical_store_owner_leaked".to_owned()),
                }
                match Arc::try_unwrap(repository) {
                    Ok(repository) => match repository.into_inner() {
                        Ok(repository) => {
                            if let Err(error) = repository.close() {
                                cleanup_errors.push(error);
                            }
                        }
                        Err(_) => cleanup_errors.push("repository_unavailable".to_owned()),
                    },
                    Err(_) => cleanup_errors.push("repository_owner_leaked".to_owned()),
                }
            }
            Err(_) => cleanup_errors.push("service_owner_leaked".to_owned()),
        }
    } else {
        drop(state);
    }
    if cleanup_errors.is_empty() {
        Ok(())
    } else {
        Err(format!("shutdown_incomplete:{}", cleanup_errors.join(",")))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn socket_pair() -> (TcpStream, TcpStream) {
        let listener = TcpListener::bind(("127.0.0.1", 0)).expect("listener");
        let client = TcpStream::connect(listener.local_addr().expect("address")).expect("client");
        let (server, _) = listener.accept().expect("server");
        (client, server)
    }

    #[test]
    fn bounds_admission_and_releases_slots_with_the_lease() {
        let owner = Arc::new(ActiveConnections::default());
        let mut clients = Vec::new();
        let mut leases = Vec::new();
        for _ in 0..MAX_ACTIVE_HTTP_CONNECTIONS {
            let (client, server) = socket_pair();
            clients.push(client);
            leases.push(owner.admit(&server).expect("admit").expect("slot"));
        }
        assert_eq!(owner.active(), MAX_ACTIVE_HTTP_CONNECTIONS);
        let (_client, server) = socket_pair();
        assert!(owner.admit(&server).expect("bound").is_none());
        leases.pop();
        assert_eq!(owner.active(), MAX_ACTIVE_HTTP_CONNECTIONS - 1);
        assert!(owner.admit(&server).expect("readmit").is_some());
    }

    #[test]
    fn interrupting_connections_unblocks_socket_reads() {
        let owner = Arc::new(ActiveConnections::default());
        let (_client, mut server) = socket_pair();
        let _lease = owner.admit(&server).expect("admit").expect("slot");
        owner.interrupt_all();
        let mut byte = [0_u8; 1];
        assert_eq!(server.read(&mut byte).expect("closed read"), 0);
    }
}
