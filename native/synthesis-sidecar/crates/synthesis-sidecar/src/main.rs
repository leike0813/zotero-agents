mod runtime_artifact_library_debug;
mod runtime_capabilities;
mod runtime_citation_graph_commands;
mod runtime_citation_graph_read_surface;
mod runtime_cli;
mod runtime_concept_topic_graph_surface;
mod runtime_deadline;
mod runtime_diagnostics;
mod runtime_file_system;
mod runtime_host_collection;
mod runtime_http;
mod runtime_lifecycle;
mod runtime_production_client;
mod runtime_production_compat;
mod runtime_production_ports;
mod runtime_reference_canonical;
mod runtime_reverse_host;
mod runtime_server_loop;
mod runtime_service;
mod runtime_tag_surface;
mod runtime_transfer;
mod runtime_webdav_maintenance_surface;
mod runtime_worker;
mod runtime_worker_pool;

fn main() {
    if let Err(error) = runtime_cli::run(runtime_worker::worker, runtime_service::serve) {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
