use serde_json::{Value, json};
use std::io::{BufRead, BufReader, Write};
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Condvar, Mutex, mpsc};
use std::thread;
use std::time::Duration;
use synthesis_protocol::WORKER_PROTOCOL;

struct ComputePoolInner {
    active: bool,
    queued: u8,
    restart_count: u64,
    failure_count: u8,
    degraded: bool,
}

pub(crate) struct NativeComputePool {
    inner: Mutex<ComputePoolInner>,
    available: Condvar,
}

pub(crate) struct ComputeAdmission<'a> {
    pool: &'a NativeComputePool,
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
            }),
            available: Condvar::new(),
        }
    }

    pub(crate) fn admit(
        &self,
        stopping: &AtomicBool,
    ) -> Result<ComputeAdmission<'_>, &'static str> {
        let mut inner = self.inner.lock().map_err(|_| "worker_unavailable")?;
        if inner.degraded {
            return Err("worker_unavailable");
        }
        if inner.active {
            if inner.queued >= 2 {
                return Err("worker_busy");
            }
            inner.queued += 1;
            while inner.active && !stopping.load(Ordering::Acquire) && !inner.degraded {
                inner = self
                    .available
                    .wait(inner)
                    .map_err(|_| "worker_unavailable")?;
            }
            inner.queued = inner.queued.saturating_sub(1);
        }
        if stopping.load(Ordering::Acquire) {
            return Err("worker_canceled");
        }
        if inner.degraded {
            return Err("worker_unavailable");
        }
        inner.active = true;
        Ok(ComputeAdmission { pool: self })
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
        self.available.notify_all();
    }

    pub(crate) fn snapshot(&self, stopping: bool) -> Result<Value, String> {
        let inner = self
            .inner
            .lock()
            .map_err(|_| "worker_unavailable".to_owned())?;
        Ok(json!({
            "state":if stopping {"stopping"} else if inner.degraded {"degraded"} else if inner.active {"busy"} else {"idle"},
            "active":if inner.active {1} else {0},
            "queued":inner.queued,
            "restartCount":inner.restart_count,
            "failureCount":inner.failure_count,
        }))
    }
}

impl Drop for ComputeAdmission<'_> {
    fn drop(&mut self) {
        if let Ok(mut inner) = self.pool.inner.lock() {
            inner.active = false;
            self.pool.available.notify_one();
        }
    }
}

pub(crate) fn worker_call(operation: &str, request: Value) -> Result<Value, String> {
    let executable = std::env::current_exe().map_err(|error| error.to_string())?;
    let mut child = Command::new(executable)
        .arg("worker")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::inherit())
        .spawn()
        .map_err(|error| error.to_string())?;
    let stdout = child.stdout.take().ok_or("worker_unavailable")?;
    let mut lines = BufReader::new(stdout).lines();
    let ready = lines
        .next()
        .ok_or("worker_unavailable")?
        .map_err(|error| error.to_string())?;
    let ready: Value = serde_json::from_str(&ready).map_err(|_| "worker_result_invalid")?;
    if ready["type"] != "ready" {
        return Err("worker_result_invalid".into());
    }
    let frame = json!({"protocol":WORKER_PROTOCOL,"type":"run","taskId":"candidate:1","operation":operation,"payload":request});
    serde_json::to_writer(child.stdin.as_mut().ok_or("worker_unavailable")?, &frame)
        .map_err(|error| error.to_string())?;
    child
        .stdin
        .as_mut()
        .expect("worker stdin")
        .write_all(b"\n")
        .map_err(|error| error.to_string())?;
    let (sender, receiver) = mpsc::sync_channel(1);
    thread::spawn(move || {
        let _ = sender.send(lines.next());
    });
    let result = match receiver.recv_timeout(Duration::from_secs(5)) {
        Ok(Some(result)) => result.map_err(|error| error.to_string())?,
        Ok(None) => return Err("worker_crashed".into()),
        Err(mpsc::RecvTimeoutError::Timeout) => {
            let _ = child.kill();
            return Err("worker_timeout".into());
        }
        Err(mpsc::RecvTimeoutError::Disconnected) => {
            return Err("worker_crashed".into());
        }
    };
    let result: Value = serde_json::from_str(&result).map_err(|_| "worker_result_invalid")?;
    let _ = child.kill();
    if result["type"] == "result" {
        Ok(result["result"].clone())
    } else {
        Err(result["code"]
            .as_str()
            .unwrap_or("worker_result_invalid")
            .to_owned())
    }
}
