use std::collections::BTreeMap;
use std::io;
use std::net::{Shutdown, TcpListener, TcpStream};
use std::sync::{Arc, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant};

use crate::runtime_capabilities::{RequestContext, handle_connection};
use crate::runtime_diagnostics::{NativeDiagnosticEvent, emit_debug};
use crate::runtime_http::configure_http_stream;
use crate::runtime_lifecycle::StopSignal;

const MAX_ACTIVE_HTTP_CONNECTIONS: usize = 16;

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
    fn is_full(&self) -> Result<bool, String> {
        self.state
            .lock()
            .map(|state| state.sockets.len() >= MAX_ACTIVE_HTTP_CONNECTIONS)
            .map_err(|_| "http_connection_owner_unavailable".to_owned())
    }

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

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) struct TransportDrain {
    pub(crate) pending_handlers: usize,
    pub(crate) handler_panicked: bool,
}

pub(crate) struct SidecarTransport {
    listener: Option<TcpListener>,
    connections: Arc<ActiveConnections>,
    handlers: Vec<JoinHandle<()>>,
    handler_panicked: bool,
}

impl SidecarTransport {
    pub(crate) fn bind() -> Result<Self, String> {
        let listener = TcpListener::bind(("127.0.0.1", 0)).map_err(|error| error.to_string())?;
        listener
            .set_nonblocking(true)
            .map_err(|error| error.to_string())?;
        Ok(Self {
            listener: Some(listener),
            connections: Arc::new(ActiveConnections::default()),
            handlers: Vec::new(),
            handler_panicked: false,
        })
    }

    pub(crate) fn port(&self) -> Result<u16, String> {
        self.listener
            .as_ref()
            .ok_or_else(|| "http_listener_stopped".to_owned())?
            .local_addr()
            .map_err(|error| error.to_string())
            .map(|address| address.port())
    }

    fn accept_if_capacity(&self) -> Result<Option<TcpStream>, String> {
        if self.connections.is_full()? {
            return Ok(None);
        }
        let listener = self
            .listener
            .as_ref()
            .ok_or_else(|| "http_listener_stopped".to_owned())?;
        match listener.accept() {
            Ok((stream, _)) => Ok(Some(stream)),
            Err(error) if error.kind() == io::ErrorKind::WouldBlock => Ok(None),
            Err(error) => Err(error.to_string()),
        }
    }

    pub(crate) fn poll(
        &mut self,
        context: &Arc<RequestContext>,
        stop_signal: &StopSignal,
    ) -> Result<bool, String> {
        reap_finished_handlers(&mut self.handlers, &mut self.handler_panicked);
        match self.accept_if_capacity()? {
            Some(stream) => {
                if let Err(error) = configure_http_stream(&stream) {
                    emit_debug(|| {
                        NativeDiagnosticEvent::new("process", "http-handler-failed", "failed")
                            .code(error)
                    });
                    return Ok(true);
                }
                if stop_signal.is_stopping() {
                    let _ = stream.shutdown(Shutdown::Both);
                    return Ok(true);
                }
                let lease = self
                    .connections
                    .admit(&stream)?
                    .ok_or_else(|| "http_connection_capacity_invariant".to_owned())?;
                let context = Arc::clone(context);
                self.handlers.push(thread::spawn(move || {
                    let _lease = lease;
                    if let Err(error) = handle_connection(stream, context) {
                        emit_debug(|| {
                            NativeDiagnosticEvent::new("process", "http-handler-failed", "failed")
                                .code(error)
                        });
                    }
                }));
                Ok(true)
            }
            None => Ok(false),
        }
    }

    pub(crate) fn begin_shutdown(&mut self) {
        self.listener.take();
        self.connections.interrupt_all();
    }

    pub(crate) fn drain(&mut self, deadline: Instant) -> TransportDrain {
        let pending_handlers =
            drain_handlers_until(&mut self.handlers, &mut self.handler_panicked, deadline);
        TransportDrain {
            pending_handlers,
            handler_panicked: self.handler_panicked,
        }
    }
}

impl Drop for SidecarTransport {
    fn drop(&mut self) {
        self.listener.take();
        self.connections.interrupt_all();
        reap_finished_handlers(&mut self.handlers, &mut self.handler_panicked);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Read;

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

    #[test]
    fn saturated_listener_leaves_next_connection_in_backlog() {
        let transport = SidecarTransport::bind().expect("transport");
        let mut clients = Vec::new();
        let mut leases = Vec::new();
        for _ in 0..MAX_ACTIVE_HTTP_CONNECTIONS {
            let (client, server) = socket_pair();
            clients.push(client);
            leases.push(
                transport
                    .connections
                    .admit(&server)
                    .expect("admit")
                    .expect("slot"),
            );
        }

        let queued = TcpStream::connect(("127.0.0.1", transport.port().expect("port")))
            .expect("queued client");
        assert!(transport.accept_if_capacity().expect("saturated").is_none());

        leases.pop();
        assert!(
            transport
                .accept_if_capacity()
                .expect("capacity released")
                .is_some()
        );
        drop(queued);
    }
}
