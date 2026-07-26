mod runtime_cli;
mod runtime_http;
mod runtime_lifecycle;
mod runtime_service;
mod runtime_worker_pool;

fn main() {
    if let Err(error) = runtime_cli::run(runtime_service::worker, runtime_service::serve) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
