use std::fs;

use synthesis_test_support::TestRoot;

#[test]
fn test_root_creates_a_portable_unique_directory_and_cleans_it() {
    let path = {
        let root = TestRoot::new("repository migration: v3");
        let path = root.path().to_path_buf();
        assert!(path.is_dir());
        assert!(
            path.file_name()
                .and_then(|name| name.to_str())
                .is_some_and(|name| name
                    .chars()
                    .all(|character| character.is_ascii_alphanumeric()
                        || matches!(character, '-' | '_' | '.')))
        );
        path
    };

    assert!(!path.exists());
}

#[test]
fn test_root_exposes_a_path_view_for_fixture_state() {
    let root = TestRoot::new("fixture");
    let state = root.join("state.json");
    fs::write(&state, b"{}\n").expect("write fixture state");
    assert_eq!(fs::read(state).expect("read fixture state"), b"{}\n");
}
