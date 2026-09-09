use std::cell::Cell;
use std::time::{Duration, Instant};

thread_local! {
    static REQUEST_DEADLINE: Cell<Option<Instant>> = const { Cell::new(None) };
}

pub(crate) fn with_request_deadline<T>(duration: Duration, operation: impl FnOnce() -> T) -> T {
    REQUEST_DEADLINE.with(|deadline| {
        let previous = deadline.replace(Some(Instant::now() + duration));
        let result = operation();
        deadline.set(previous);
        result
    })
}

pub(crate) fn with_request_context<T>(
    duration: Duration,
    _correlation_id: Option<&str>,
    operation: impl FnOnce() -> T,
) -> T {
    with_request_deadline(duration, operation)
}

pub(crate) fn bounded_timeout(maximum: Duration) -> Result<Duration, String> {
    REQUEST_DEADLINE.with(|deadline| match deadline.get() {
        Some(deadline) => {
            let remaining = deadline.saturating_duration_since(Instant::now());
            if remaining.is_zero() {
                Err("operation_timeout".into())
            } else {
                Ok(remaining.min(maximum))
            }
        }
        None => Ok(maximum),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn request_deadline_bounds_downstream_timeouts_and_is_restored() {
        with_request_deadline(Duration::from_millis(20), || {
            let bounded = bounded_timeout(Duration::from_secs(2)).expect("bounded");
            assert!(bounded <= Duration::from_millis(20));
        });
        assert_eq!(
            bounded_timeout(Duration::from_secs(2)).expect("restored"),
            Duration::from_secs(2)
        );
    }
}
