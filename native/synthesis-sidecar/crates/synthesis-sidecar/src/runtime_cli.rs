pub(crate) fn run(
    worker: fn() -> Result<(), String>,
    serve: fn(&str) -> Result<(), String>,
    serve_production: fn(&str, &str) -> Result<(), String>,
    preflight_production: fn(&str, &str) -> Result<(), String>,
    prepare_empty_production: fn(&str) -> Result<(), String>,
) -> Result<(), String> {
    let args: Vec<String> = std::env::args().collect();
    run_args(
        &args,
        worker,
        serve,
        serve_production,
        preflight_production,
        prepare_empty_production,
    )
}

fn run_args<Worker, Serve, ServeProduction, Preflight, PrepareEmpty>(
    args: &[String],
    worker: Worker,
    serve: Serve,
    serve_production: ServeProduction,
    preflight_production: Preflight,
    prepare_empty_production: PrepareEmpty,
) -> Result<(), String>
where
    Worker: FnOnce() -> Result<(), String>,
    Serve: FnOnce(&str) -> Result<(), String>,
    ServeProduction: FnOnce(&str, &str) -> Result<(), String>,
    Preflight: FnOnce(&str, &str) -> Result<(), String>,
    PrepareEmpty: FnOnce(&str) -> Result<(), String>,
{
    match args.get(1).map(String::as_str) {
        Some("worker") => worker(),
        Some("serve") if args.get(2).map(String::as_str) == Some("--config") => args
            .get(3)
            .ok_or_else(|| "missing_config".to_owned())
            .and_then(|path| serve(path)),
        Some("preflight-production")
            if args.get(2).map(String::as_str) == Some("--config")
                && args.get(4).map(String::as_str) == Some("--admission") =>
        {
            let config = args
                .get(3)
                .ok_or_else(|| "missing_config".to_owned())?;
            let admission = args
                .get(5)
                .ok_or_else(|| "missing_admission".to_owned())?;
            preflight_production(config, admission)
        }
        Some("serve-production")
            if args.get(2).map(String::as_str) == Some("--config")
                && args.get(4).map(String::as_str) == Some("--admission") =>
        {
            let config = args
                .get(3)
                .ok_or_else(|| "missing_config".to_owned())?;
            let admission = args
                .get(5)
                .ok_or_else(|| "missing_admission".to_owned())?;
            serve_production(config, admission)
        }
        Some("prepare-empty-production")
            if args.get(2).map(String::as_str) == Some("--request") =>
        {
            args.get(3)
                .ok_or_else(|| "missing_request".to_owned())
                .and_then(|request_path| prepare_empty_production(request_path))
        }
        _ => Err(
            "usage: synthesis-sidecar <worker|serve --config CONFIG|serve-production --config CONFIG --admission ADMISSION|preflight-production --config CONFIG --admission ADMISSION|prepare-empty-production --request REQUEST>"
                .into(),
        ),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::{Arc, Mutex};

    #[test]
    fn routes_production_copy_preflight_without_starting_service() {
        let calls = Arc::new(Mutex::new(Vec::new()));
        let worker_calls = Arc::clone(&calls);
        let serve_calls = Arc::clone(&calls);
        let preflight_calls = Arc::clone(&calls);
        run_args(
            &[
                "synthesis-sidecar".into(),
                "preflight-production".into(),
                "--config".into(),
                "config.json".into(),
                "--admission".into(),
                "admission.json".into(),
            ],
            move || {
                worker_calls.lock().unwrap().push("worker".to_owned());
                Ok(())
            },
            move |_| {
                serve_calls.lock().unwrap().push("serve".to_owned());
                Ok(())
            },
            |_, _| Ok(()),
            move |config, admission| {
                preflight_calls
                    .lock()
                    .unwrap()
                    .push(format!("preflight:{config}:{admission}"));
                Ok(())
            },
            |_| Ok(()),
        )
        .unwrap();
        assert_eq!(
            calls.lock().unwrap().as_slice(),
            ["preflight:config.json:admission.json"]
        );
    }

    #[test]
    fn routes_empty_production_initialization_without_starting_service() {
        let calls = Arc::new(Mutex::new(Vec::new()));
        let prepare_calls = Arc::clone(&calls);
        run_args(
            &[
                "synthesis-sidecar".into(),
                "prepare-empty-production".into(),
                "--request".into(),
                "request.json".into(),
            ],
            || Ok(()),
            |_| Ok(()),
            |_, _| Ok(()),
            |_, _| Ok(()),
            move |request| {
                prepare_calls
                    .lock()
                    .unwrap()
                    .push(format!("prepare:{request}"));
                Ok(())
            },
        )
        .unwrap();
        assert_eq!(calls.lock().unwrap().as_slice(), ["prepare:request.json"]);
    }
}
