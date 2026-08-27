use std::cell::RefCell;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Condvar, Mutex};
use std::thread::{self, JoinHandle};
use std::time::Instant;

thread_local! {
    static CURRENT_CANCELLATION: RefCell<Option<Arc<AtomicBool>>> = const { RefCell::new(None) };
}

struct BackgroundTask {
    cancellation: Arc<AtomicBool>,
    handle: JoinHandle<()>,
}

struct BackgroundTaskState {
    accepting: bool,
    tasks: Vec<BackgroundTask>,
}

pub(crate) struct BackgroundTaskOwner {
    state: Mutex<BackgroundTaskState>,
    changed: Condvar,
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub(crate) struct BackgroundDrain {
    pub(crate) remaining: usize,
    pub(crate) panicked: usize,
}

impl BackgroundTaskOwner {
    pub(crate) fn new() -> Arc<Self> {
        Arc::new(Self {
            state: Mutex::new(BackgroundTaskState {
                accepting: true,
                tasks: Vec::new(),
            }),
            changed: Condvar::new(),
        })
    }

    pub(crate) fn spawn(
        self: &Arc<Self>,
        name: impl Into<String>,
        cancellation: Arc<AtomicBool>,
        task: impl FnOnce() + Send + 'static,
    ) -> Result<(), String> {
        let name = name.into();
        let mut state = self
            .state
            .lock()
            .map_err(|_| "background_task_owner_unavailable".to_owned())?;
        if !state.accepting {
            return Err("background_task_stopping".into());
        }
        let weak = Arc::downgrade(self);
        let task_cancellation = Arc::clone(&cancellation);
        let handle = thread::Builder::new()
            .name(name.clone())
            .spawn(move || {
                with_cancellation_context(task_cancellation, task);
                if let Some(owner) = weak.upgrade() {
                    owner.changed.notify_all();
                }
            })
            .map_err(|_| "background_task_spawn_failed".to_owned())?;
        state.tasks.push(BackgroundTask {
            cancellation,
            handle,
        });
        Ok(())
    }

    pub(crate) fn stop_admission(&self) {
        if let Ok(mut state) = self.state.lock() {
            state.accepting = false;
            for task in &state.tasks {
                task.cancellation.store(true, Ordering::Release);
            }
            self.changed.notify_all();
        }
    }

    pub(crate) fn reap_finished(&self) -> BackgroundDrain {
        let Ok(mut state) = self.state.lock() else {
            return BackgroundDrain {
                remaining: 1,
                panicked: 0,
            };
        };
        reap_locked(&mut state)
    }

    pub(crate) fn stop_and_drain_until(&self, deadline: Instant) -> BackgroundDrain {
        self.stop_admission();
        let Ok(mut state) = self.state.lock() else {
            return BackgroundDrain {
                remaining: 1,
                panicked: 0,
            };
        };
        let mut panicked = 0;
        loop {
            panicked += reap_locked(&mut state).panicked;
            if state.tasks.is_empty() || Instant::now() >= deadline {
                return BackgroundDrain {
                    remaining: state.tasks.len(),
                    panicked,
                };
            }
            let wait = deadline.saturating_duration_since(Instant::now());
            let Ok((next, _)) = self.changed.wait_timeout(state, wait) else {
                return BackgroundDrain {
                    remaining: 1,
                    panicked,
                };
            };
            state = next;
        }
    }
}

fn reap_locked(state: &mut BackgroundTaskState) -> BackgroundDrain {
    let mut panicked = 0;
    let mut index = 0;
    while index < state.tasks.len() {
        if state.tasks[index].handle.is_finished() {
            let task = state.tasks.swap_remove(index);
            if task.handle.join().is_err() {
                panicked += 1;
            }
        } else {
            index += 1;
        }
    }
    BackgroundDrain {
        remaining: state.tasks.len(),
        panicked,
    }
}

fn with_cancellation_context<T>(cancellation: Arc<AtomicBool>, task: impl FnOnce() -> T) -> T {
    CURRENT_CANCELLATION.with(|current| {
        let previous = current.replace(Some(cancellation));
        let result = task();
        current.replace(previous);
        result
    })
}

pub(crate) fn current_task_canceled() -> bool {
    CURRENT_CANCELLATION.with(|current| {
        current
            .borrow()
            .as_ref()
            .is_some_and(|cancellation| cancellation.load(Ordering::Acquire))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::mpsc;
    use std::time::Duration;

    #[test]
    fn stops_admission_cancels_and_drains_registered_tasks() {
        let owner = BackgroundTaskOwner::new();
        let cancellation = Arc::new(AtomicBool::new(false));
        let observed = Arc::new(AtomicBool::new(false));
        let worker_observed = Arc::clone(&observed);
        owner
            .spawn("fixture", Arc::clone(&cancellation), move || {
                while !current_task_canceled() {
                    thread::sleep(Duration::from_millis(1));
                }
                worker_observed.store(true, Ordering::Release);
            })
            .expect("spawn");
        let drain = owner.stop_and_drain_until(Instant::now() + Duration::from_millis(100));
        assert_eq!(drain, BackgroundDrain::default());
        assert!(cancellation.load(Ordering::Acquire));
        assert!(observed.load(Ordering::Acquire));
        assert_eq!(
            owner.spawn("late", Arc::new(AtomicBool::new(false)), || unreachable!()),
            Err("background_task_stopping".into())
        );
    }

    #[test]
    fn reports_tasks_that_ignore_the_shared_deadline() {
        let owner = BackgroundTaskOwner::new();
        let (started_sender, started_receiver) = mpsc::sync_channel(0);
        let (release_sender, release_receiver) = mpsc::sync_channel(0);
        owner
            .spawn("blocked", Arc::new(AtomicBool::new(false)), move || {
                started_sender.send(()).expect("publish task start");
                release_receiver.recv().expect("release blocked task");
            })
            .expect("spawn");
        started_receiver
            .recv_timeout(Duration::from_secs(1))
            .expect("task started");
        let drain = owner.stop_and_drain_until(Instant::now() + Duration::from_millis(1));
        assert_eq!(drain.remaining, 1);
        release_sender.send(()).expect("release task");
        assert_eq!(
            owner.stop_and_drain_until(Instant::now() + Duration::from_secs(1)),
            BackgroundDrain::default()
        );
    }
}
