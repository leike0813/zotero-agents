use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::time::Duration;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum AdmissionError {
    Busy,
    Stopping,
    Unavailable,
}

struct AdmissionState {
    accepting: bool,
    active: Option<Arc<AtomicBool>>,
}

pub(crate) struct SingleFlightAdmission {
    state: Mutex<AdmissionState>,
    drained: Condvar,
}

pub(crate) struct AdmissionLease<'a> {
    owner: &'a SingleFlightAdmission,
    canceled: Arc<AtomicBool>,
}

impl SingleFlightAdmission {
    pub(crate) fn new() -> Self {
        Self {
            state: Mutex::new(AdmissionState {
                accepting: true,
                active: None,
            }),
            drained: Condvar::new(),
        }
    }

    pub(crate) fn admit(&self) -> Result<AdmissionLease<'_>, AdmissionError> {
        let mut state = self.state.lock().map_err(|_| AdmissionError::Unavailable)?;
        if !state.accepting {
            return Err(AdmissionError::Stopping);
        }
        if state.active.is_some() {
            return Err(AdmissionError::Busy);
        }
        let canceled = Arc::new(AtomicBool::new(false));
        state.active = Some(Arc::clone(&canceled));
        Ok(AdmissionLease {
            owner: self,
            canceled,
        })
    }

    pub(crate) fn stop(&self) {
        if let Ok(mut state) = self.state.lock() {
            state.accepting = false;
            if let Some(canceled) = &state.active {
                canceled.store(true, Ordering::Relaxed);
            }
        }
    }

    pub(crate) fn shutdown(&self, timeout: Duration, code: &str) -> Result<(), String> {
        self.stop();
        let state = self
            .state
            .lock()
            .map_err(|_| format!("{code}_unavailable"))?;
        let (state, wait) = self
            .drained
            .wait_timeout_while(state, timeout, |state| state.active.is_some())
            .map_err(|_| format!("{code}_unavailable"))?;
        if wait.timed_out() && state.active.is_some() {
            Err(format!("{code}_drain_timeout"))
        } else {
            Ok(())
        }
    }
}

impl AdmissionLease<'_> {
    pub(crate) fn canceled(&self) -> &Arc<AtomicBool> {
        &self.canceled
    }
}

impl Drop for AdmissionLease<'_> {
    fn drop(&mut self) {
        if let Ok(mut state) = self.owner.state.lock() {
            state.active = None;
            self.owner.drained.notify_all();
        }
    }
}
