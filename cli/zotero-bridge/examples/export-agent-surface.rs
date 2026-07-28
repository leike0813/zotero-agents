#![allow(dead_code)]

#[path = "../src/args.rs"]
mod args;
#[path = "../src/contract.rs"]
mod contract;
#[path = "../src/error.rs"]
mod error;
#[path = "../src/surface.rs"]
mod surface;

fn main() {
    let descriptor = surface::descriptor().expect("derive Agent Surface");
    println!(
        "{}",
        serde_json::to_string_pretty(&descriptor).expect("serialize Agent Surface")
    );
}
