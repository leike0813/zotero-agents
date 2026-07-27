mod runtime_capabilities;
mod runtime_cli;
mod runtime_http;
mod runtime_lifecycle;
mod runtime_production_client;
mod runtime_service;
mod runtime_transfer;
mod runtime_worker;
mod runtime_worker_pool;

fn main() {
    if let Err(error) = runtime_cli::run(
        runtime_worker::worker,
        runtime_service::serve,
        runtime_service::serve_production,
        runtime_service::preflight_production,
    ) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
