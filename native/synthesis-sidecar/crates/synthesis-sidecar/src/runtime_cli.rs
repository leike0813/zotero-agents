pub(crate) fn run(
    worker: fn() -> Result<(), String>,
    serve: fn(&str) -> Result<(), String>,
) -> Result<(), String> {
    let args: Vec<String> = std::env::args().collect();
    match args.get(1).map(String::as_str) {
        Some("worker") => worker(),
        Some("serve") if args.get(2).map(String::as_str) == Some("--config") => args
            .get(3)
            .ok_or_else(|| "missing_config".to_owned())
            .and_then(|path| serve(path)),
        _ => Err("usage: synthesis-sidecar <worker|serve --config CONFIG>".into()),
    }
}
