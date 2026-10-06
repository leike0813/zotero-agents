#!/usr/bin/env bash
# Run from the repository root. Creates only a fresh, ignored experiment directory.
set -euo pipefail

build_root=".scaffold/test/issue89-repro-build"
if [[ -e "$build_root" ]]; then
  printf '%s\n' "Build directory already exists; use its Cargo.toml to resume."
  exit 2
fi
mkdir -p "$build_root/upstream"
upstream_commit="e9f598abfa0c06b328d8fe5da9c3760cce74be10"
for source_file in sqlite-vec.c sqlite-vec.h.tmpl; do
  curl --fail --silent --show-error --location \
    "https://raw.githubusercontent.com/asg017/sqlite-vec/$upstream_commit/$source_file" \
    --output "$build_root/upstream/$source_file"
done

cat > "$build_root/Cargo.toml" <<'TOML'
[package]
name = "issue89-benchmark"
version = "0.1.0"
edition = "2024"
build = "build.rs"

[dependencies]
rusqlite = { version = "=0.40.1", default-features = false, features = ["bundled", "backup"] }
serde_json = "=1.0.150"

[build-dependencies]
cc = "=1.4.0"

[[bin]]
name = "issue89-benchmark"
path = "../../../artifacts/vector-retrieval-wayfinder/issue89/benchmark.rs"
TOML

cat > "$build_root/build.rs" <<'RUST'
use std::{env, fs, path::PathBuf};
fn main() {
    let root = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let out = PathBuf::from(env::var("OUT_DIR").unwrap());
    let cargo_home = env::var_os("CARGO_HOME").map(PathBuf::from)
        .unwrap_or_else(|| PathBuf::from(env::var_os("HOME").unwrap()).join(".cargo"));
    let include = fs::read_dir(cargo_home.join("registry/src")).unwrap()
        .filter_map(Result::ok)
        .map(|e| e.path().join("libsqlite3-sys-0.38.1/sqlite3"))
        .find(|p| p.join("sqlite3.h").is_file()).expect("cached bundled SQLite headers");
    let header = fs::read_to_string(root.join("upstream/sqlite-vec.h.tmpl")).unwrap()
        .replace("${VERSION}", "0.1.9").replace("${DATE}", "")
        .replace("${SOURCE}", "e9f598abfa0c06b328d8fe5da9c3760cce74be10")
        .replace("${VERSION_MAJOR}", "0").replace("${VERSION_MINOR}", "1")
        .replace("${VERSION_PATCH}", "9");
    fs::write(out.join("sqlite-vec.h"), header).unwrap();
    cc::Build::new().file(root.join("upstream/sqlite-vec.c"))
        .include(out).include(include).define("SQLITE_CORE", None)
        .define("SQLITE_VEC_STATIC", None).define("SQLITE_VEC_OMIT_FS", None)
        .flag_if_supported("-Wno-unused-parameter").compile("sqlite_vec_v019");
    println!("cargo:rerun-if-changed=upstream/sqlite-vec.c");
    println!("cargo:rerun-if-changed=upstream/sqlite-vec.h.tmpl");
}
RUST

cargo +nightly-2026-07-25 test --offline --manifest-path "$build_root/Cargo.toml"
cargo +nightly-2026-07-25 build --release --offline --manifest-path "$build_root/Cargo.toml"
