pub(crate) fn run(
    worker: fn() -> Result<(), String>,
    serve: fn(&str) -> Result<(), String>,
) -> Result<(), String> {
    let args: Vec<String> = std::env::args().collect();
    run_args(&args, worker, serve)
}

fn run_args<Worker, Serve>(args: &[String], worker: Worker, serve: Serve) -> Result<(), String>
where
    Worker: FnOnce() -> Result<(), String>,
    Serve: FnOnce(&str) -> Result<(), String>,
{
    match args.get(1).map(String::as_str) {
        Some("worker") => worker(),
        Some("serve") if args.get(2).map(String::as_str) == Some("--config") => args
            .get(3)
            .ok_or_else(|| "missing_config".to_owned())
            .and_then(|path| serve(path)),
        _ => Err("usage: synthesis-sidecar <worker|serve --config CONFIG>".into()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[test]
    fn routes_the_single_service_command() {
        let calls = Arc::new(Mutex::new(Vec::new()));
        let serve_calls = Arc::clone(&calls);
        run_args(
            &[
                "synthesis-sidecar".into(),
                "serve".into(),
                "--config".into(),
                "config.json".into(),
            ],
            || Ok(()),
            move |config| {
                serve_calls.lock().unwrap().push(config.to_owned());
                Ok(())
            },
        )
        .unwrap();
        assert_eq!(calls.lock().unwrap().as_slice(), ["config.json"]);
    }
}
