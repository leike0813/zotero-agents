use std::fs::{self, OpenOptions};
use std::path::Path;
use std::thread;
use std::time::{Duration, Instant};

pub(crate) const REFERENCE_AFTER_FIRST_PAGE: &str = "reference-after-first-page";
pub(crate) const MAINTENANCE_AFTER_ADMISSION: &str = "maintenance-after-admission";

pub(crate) fn hold_once(runtime_root: &Path, name: &str) {
    let root = runtime_root.join("test-checkpoints");
    let armed = root.join(format!("{name}.armed"));
    if !armed.is_file() {
        return;
    }
    let held = root.join(format!("{name}.held"));
    if OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&held)
        .is_err()
    {
        return;
    }
    let _ = fs::remove_file(&armed);
    let release = root.join(format!("{name}.release"));
    let deadline = Instant::now() + Duration::from_secs(60);
    while !release.is_file() && Instant::now() < deadline {
        thread::sleep(Duration::from_millis(20));
    }
    let _ = fs::remove_file(release);
    let _ = fs::remove_file(held);
}

#[cfg(test)]
mod tests {
    use super::*;
    use synthesis_test_support::TestRoot;

    #[test]
    fn armed_checkpoint_is_claimed_once_and_cleans_up_after_release() {
        let root = TestRoot::new("synthesis-test-checkpoint");
        let checkpoint_root = root.join("test-checkpoints");
        fs::create_dir(&checkpoint_root).expect("checkpoint directory");
        fs::write(checkpoint_root.join("fixture.armed"), b"").expect("arm checkpoint");
        let held_root = root.to_path_buf();
        let held = thread::spawn(move || hold_once(&held_root, "fixture"));
        let deadline = Instant::now() + Duration::from_secs(1);
        while !checkpoint_root.join("fixture.held").is_file() && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(10));
        }
        assert!(checkpoint_root.join("fixture.held").is_file());

        let started = Instant::now();
        hold_once(&root, "fixture");
        assert!(started.elapsed() < Duration::from_millis(100));

        fs::write(checkpoint_root.join("fixture.release"), b"").expect("release checkpoint");
        held.join().expect("checkpoint holder");
        assert!(!checkpoint_root.join("fixture.held").exists());
        assert!(!checkpoint_root.join("fixture.release").exists());
    }
}
