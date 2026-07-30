use serde_json::json;
use std::io::{self, Read};
use std::net::TcpListener;
use std::sync::Arc;
use std::sync::atomic::Ordering;
use std::thread;
use std::time::Duration;
use synthesis_sidecar::runtime_contract::{SIDECAR_CAPABILITIES, current_time_ms};

use crate::runtime_capabilities::{ServeState, handle_connection};
use crate::runtime_diagnostics::{NativeDiagnosticEvent, emit};

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

    let mut handlers = Vec::new();
    let mut next_transfer_reap_ms = current_time_ms()?.saturating_add(30_000);
    while !state.stopping.load(Ordering::Acquire) {
        let now_ms = current_time_ms()?;
        if now_ms >= next_transfer_reap_ms {
            if let Ok(mut transfer) = state.transfer.lock() {
                transfer.reap(now_ms);
            }
            next_transfer_reap_ms = now_ms.saturating_add(30_000);
        }
        match listener.accept() {
            Ok((stream, _)) => {
                let state = Arc::clone(&state);
                handlers.push(thread::spawn(move || {
                    if let Err(error) = handle_connection(stream, state) {
                        emit(
                            NativeDiagnosticEvent::new("process", "http-handler-failed", "failed")
                                .code(error),
                        );
                    }
                }));
            }
            Err(error) if error.kind() == io::ErrorKind::WouldBlock => {
                thread::sleep(Duration::from_millis(5));
            }
            Err(error) => return Err(error.to_string()),
        }
    }
    drop(listener);

    let mut cleanup_errors = Vec::new();
    state.compute_pool.stop();
    for handler in handlers {
        if handler.join().is_err() {
            cleanup_errors.push("http_handler_panicked".to_owned());
        }
    }
    match state.transfer.lock() {
        Ok(mut transfer) => transfer.stop(),
        Err(_) => cleanup_errors.push("transfer_owner_unavailable".to_owned()),
    }
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
    if cleanup_errors.is_empty() {
        Ok(())
    } else {
        Err(format!("shutdown_incomplete:{}", cleanup_errors.join(",")))
    }
}
