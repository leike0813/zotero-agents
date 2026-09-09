use std::fs::{self, OpenOptions};
use std::path::{Path, PathBuf};
use std::sync::{Condvar, Mutex};
use std::time::Duration;

use synthesis_application::webdav_sync::{
    WebDavRetrySchedulerPort, WebDavStateStorePort, WebDavSyncState,
};

use crate::runtime_file_system::sync_directory;

pub(crate) struct FileWebDavStateStore {
    path: PathBuf,
    io: Mutex<()>,
}

impl FileWebDavStateStore {
    pub(crate) fn new(path: PathBuf) -> Self {
        Self {
            path,
            io: Mutex::new(()),
        }
    }

    fn backup_path(&self) -> PathBuf {
        self.path.with_extension("json.previous")
    }

    fn temporary_path(&self) -> PathBuf {
        self.path.with_extension("json.pending")
    }

    fn load_unlocked(&self) -> Result<Option<WebDavSyncState>, String> {
        let path = if self.path.exists() {
            &self.path
        } else {
            let backup = self.backup_path();
            if !backup.exists() {
                return Ok(None);
            }
            return read_state(&backup).map(Some);
        };
        read_state(path).map(Some)
    }

    fn save_unlocked(&self, state: &WebDavSyncState) -> Result<(), String> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| "webdav_state_unavailable".to_owned())?;
        fs::create_dir_all(parent).map_err(|_| "webdav_state_unavailable".to_owned())?;
        let pending = self.temporary_path();
        let bytes =
            serde_json::to_vec(state).map_err(|_| "webdav_sync_state_invalid".to_owned())?;
        fs::write(&pending, bytes).map_err(|_| "webdav_state_unavailable".to_owned())?;
        OpenOptions::new()
            .write(true)
            .open(&pending)
            .and_then(|file| file.sync_all())
            .map_err(|_| "webdav_state_unavailable".to_owned())?;
        let backup = self.backup_path();
        if self.path.exists() {
            if backup.exists() {
                fs::remove_file(&backup).map_err(|_| "webdav_state_unavailable".to_owned())?;
            }
            fs::rename(&self.path, &backup).map_err(|_| "webdav_state_unavailable".to_owned())?;
        }
        if let Err(error) = fs::rename(&pending, &self.path) {
            if backup.exists() && !self.path.exists() {
                let _ = fs::rename(&backup, &self.path);
            }
            return Err(format!("webdav_state_unavailable:{error}"));
        }
        sync_directory(parent).map_err(|_| "webdav_state_unavailable".to_owned())?;
        if backup.exists() {
            fs::remove_file(backup).map_err(|_| "webdav_state_unavailable".to_owned())?;
        }
        Ok(())
    }
}

impl WebDavStateStorePort for FileWebDavStateStore {
    fn load(&self) -> Result<Option<WebDavSyncState>, String> {
        let _io = self
            .io
            .lock()
            .map_err(|_| "webdav_state_unavailable".to_owned())?;
        self.load_unlocked()
    }

    fn save(&self, state: &WebDavSyncState) -> Result<(), String> {
        let _io = self
            .io
            .lock()
            .map_err(|_| "webdav_state_unavailable".to_owned())?;
        self.save_unlocked(state)
    }
}

fn read_state(path: &Path) -> Result<WebDavSyncState, String> {
    serde_json::from_slice(&fs::read(path).map_err(|_| "webdav_state_unavailable".to_owned())?)
        .map_err(|_| "webdav_sync_state_invalid".to_owned())
}

#[derive(Default)]
pub(crate) struct InterruptibleWebDavRetryScheduler {
    canceled_through: Mutex<u64>,
    changed: Condvar,
}

impl WebDavRetrySchedulerPort for InterruptibleWebDavRetryScheduler {
    fn wait(&self, delay_ms: u64, generation: u64) -> Result<bool, String> {
        let canceled = self
            .canceled_through
            .lock()
            .map_err(|_| "webdav_sync_unavailable".to_owned())?;
        if *canceled >= generation {
            return Ok(false);
        }
        let (canceled, timeout) = self
            .changed
            .wait_timeout_while(canceled, Duration::from_millis(delay_ms), |canceled| {
                *canceled < generation
            })
            .map_err(|_| "webdav_sync_unavailable".to_owned())?;
        Ok(timeout.timed_out() && *canceled < generation)
    }

    fn cancel(&self, generation: u64) {
        if let Ok(mut canceled) = self.canceled_through.lock() {
            *canceled = (*canceled).max(generation);
            self.changed.notify_all();
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Barrier};
    use std::thread;
    use std::time::{Instant, SystemTime, UNIX_EPOCH};

    #[test]
    fn state_survives_store_reopen() {
        let root = std::env::temp_dir().join(format!(
            "synthesis-webdav-state-{}-{}",
            std::process::id(),
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ));
        let path = root.join("native-webdav-state.json");
        let state = WebDavSyncState {
            schema_id: "synthesis.webdav_sync_state".into(),
            schema_version: "1".into(),
            queue_state: "paused".into(),
            ..WebDavSyncState::default()
        };
        FileWebDavStateStore::new(path.clone())
            .save(&state)
            .expect("persist state");
        let reopened = FileWebDavStateStore::new(path)
            .load()
            .expect("reopen state")
            .expect("stored state");
        assert_eq!(reopened.queue_state, "paused");
        std::fs::remove_dir_all(root).expect("remove test state");
    }

    #[test]
    fn retry_wait_is_interrupted_without_waiting_for_the_delay() {
        let scheduler = Arc::new(InterruptibleWebDavRetryScheduler::default());
        let waiting = Arc::clone(&scheduler);
        let waiting_started = Arc::new(Barrier::new(2));
        let worker_started = Arc::clone(&waiting_started);
        let started = Instant::now();
        let worker = thread::spawn(move || {
            worker_started.wait();
            waiting.wait(60_000, 7)
        });
        waiting_started.wait();
        scheduler.cancel(7);
        assert!(!worker.join().expect("wait thread").expect("wait"));
        assert!(started.elapsed() < Duration::from_millis(200));
    }
}
