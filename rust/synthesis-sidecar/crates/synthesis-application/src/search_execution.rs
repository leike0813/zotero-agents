use std::cell::{Cell, RefCell};
use std::sync::Arc;
use std::time::{Duration, Instant};

pub const VECTOR_PHASE_LIMIT: Duration = Duration::from_secs(30);
pub const LEXICAL_LIMIT: Duration = Duration::from_secs(8);
pub(crate) const SCOPE_LIMIT: Duration = Duration::from_secs(15);

type ThreadContext = Arc<dyn Fn() -> Box<dyn std::any::Any> + Send + Sync>;

thread_local! {
    static DEADLINE: Cell<Option<Instant>> = const { Cell::new(None) };
    static THREAD_CONTEXT: RefCell<Option<ThreadContext>> = const { RefCell::new(None) };
}

pub fn with_thread_context<T>(context: ThreadContext, run: impl FnOnce() -> T) -> T {
    struct Restore(Option<ThreadContext>);
    impl Drop for Restore {
        fn drop(&mut self) {
            THREAD_CONTEXT.replace(self.0.take());
        }
    }
    let _restore = Restore(THREAD_CONTEXT.replace(Some(context)));
    run()
}

pub(crate) struct Phase {
    previous: Option<Instant>,
    _thread: std::marker::PhantomData<std::rc::Rc<()>>,
}

impl Drop for Phase {
    fn drop(&mut self) {
        DEADLINE.set(self.previous);
    }
}

fn start(limit: Instant) -> Phase {
    let previous = DEADLINE.get();
    DEADLINE.set(Some(previous.map_or(limit, |previous| previous.min(limit))));
    Phase {
        previous,
        _thread: std::marker::PhantomData,
    }
}

pub(crate) fn phase(budget: Duration) -> Phase {
    start(Instant::now() + budget)
}

pub fn within<T>(budget: Duration, run: impl FnOnce() -> T) -> T {
    let _phase = phase(budget);
    run()
}

pub fn remaining() -> Option<Duration> {
    DEADLINE
        .get()
        .map(|deadline| deadline.saturating_duration_since(Instant::now()))
}

pub(crate) fn checkpoint(caller: &dyn Fn() -> Result<(), String>) -> Result<(), String> {
    caller()?;
    if remaining().is_some_and(|remaining| remaining.is_zero()) {
        return Err("operation_timeout".into());
    }
    Ok(())
}

pub(crate) fn overlap<T: Send, U>(
    lexical: impl FnOnce() -> Result<T, String> + Send,
    vector: impl FnOnce() -> U,
) -> Result<(T, U), String> {
    let deadline = DEADLINE.get();
    let context = THREAD_CONTEXT.with_borrow(Clone::clone);
    let lexical = move || {
        let _context = context.map(|enter| enter());
        let limit = Instant::now() + LEXICAL_LIMIT;
        let _phase = start(deadline.map_or(limit, |deadline| deadline.min(limit)));
        lexical()
    };
    std::thread::scope(|scope| {
        let lexical = std::thread::Builder::new()
            .spawn_scoped(scope, lexical)
            .map_err(|_| "search_unavailable".to_owned())?;
        let vector = vector();
        let lexical = lexical
            .join()
            .map_err(|_| "search_unavailable".to_owned())??;
        Ok((lexical, vector))
    })
}

pub(crate) fn is_timeout(code: &str) -> bool {
    matches!(
        code,
        "timeout"
            | "operation_timeout"
            | "request_timeout"
            | "worker_timeout"
            | "reverse_host_deadline_invalid"
    )
}
