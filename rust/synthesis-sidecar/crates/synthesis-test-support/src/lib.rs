//! Shared test-only resource owners for the Synthesis Rust workspace.

use std::env;
use std::fs;
use std::ops::Deref;
use std::path::{Path, PathBuf};
use std::process;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

static NEXT_TEST_ROOT: AtomicU64 = AtomicU64::new(0);

/// Owns one temporary fixture root and removes it after dependent owners drop.
#[derive(Debug)]
pub struct TestRoot {
    path: PathBuf,
}

impl TestRoot {
    pub fn new(label: &str) -> Self {
        let label = portable_segment(label);
        let epoch_nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock must follow the Unix epoch")
            .as_nanos();

        for _ in 0..100 {
            let sequence = NEXT_TEST_ROOT.fetch_add(1, Ordering::Relaxed);
            let path = env::temp_dir().join(format!(
                "zotero-agents-{label}-{}-{epoch_nanos}-{sequence}",
                process::id()
            ));
            match fs::create_dir(&path) {
                Ok(()) => return Self { path },
                Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
                Err(error) => panic!("create test root {}: {error}", path.display()),
            }
        }

        panic!("allocate unique test root after 100 attempts");
    }

    pub fn path(&self) -> &Path {
        &self.path
    }
}

impl AsRef<Path> for TestRoot {
    fn as_ref(&self) -> &Path {
        self.path()
    }
}

impl Deref for TestRoot {
    type Target = Path;

    fn deref(&self) -> &Self::Target {
        self.path()
    }
}

impl Drop for TestRoot {
    fn drop(&mut self) {
        if let Err(error) = fs::remove_dir_all(&self.path) {
            if error.kind() == std::io::ErrorKind::NotFound {
                return;
            }
            let message = format!("remove test root {}: {error}", self.path.display());
            if std::thread::panicking() {
                eprintln!("secondary cleanup failure: {message}");
            } else {
                panic!("{message}");
            }
        }
    }
}

fn portable_segment(label: &str) -> String {
    let mut segment = String::with_capacity(label.len());
    for character in label.chars() {
        if character.is_ascii_alphanumeric() || matches!(character, '-' | '_' | '.') {
            segment.push(character);
        } else if !segment.ends_with('-') {
            segment.push('-');
        }
    }
    let segment = segment.trim_matches(['-', '.']);
    if segment.is_empty() {
        "fixture".to_owned()
    } else {
        segment.to_owned()
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::panic::{AssertUnwindSafe, catch_unwind};

    use super::TestRoot;

    #[test]
    fn cleanup_failure_after_success_panics() {
        let path = std::env::temp_dir().join(format!(
            "zotero-agents-test-root-file-{}",
            std::process::id()
        ));
        fs::write(&path, b"not a directory").expect("write cleanup sentinel");
        let result = catch_unwind(AssertUnwindSafe(|| {
            drop(TestRoot { path: path.clone() });
        }));
        fs::remove_file(path).expect("remove cleanup sentinel");
        assert!(result.is_err());
    }

    #[test]
    fn cleanup_failure_does_not_replace_primary_panic() {
        let path = std::env::temp_dir().join(format!(
            "zotero-agents-test-root-primary-{}",
            std::process::id()
        ));
        fs::write(&path, b"not a directory").expect("write cleanup sentinel");
        let result = catch_unwind(AssertUnwindSafe(|| {
            let _root = TestRoot { path: path.clone() };
            panic!("primary failure");
        }));
        fs::remove_file(path).expect("remove cleanup sentinel");
        let payload = result.expect_err("primary panic must be preserved");
        assert_eq!(payload.downcast_ref::<&str>(), Some(&"primary failure"));
    }
}
