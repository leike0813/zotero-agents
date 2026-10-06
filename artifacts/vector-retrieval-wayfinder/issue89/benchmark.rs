// Standalone issue #89 benchmark; not a production retrieval or maintenance owner.

use rusqlite::{Connection, params};
use serde_json::{Value, json};
use std::{
    cmp::Ordering,
    collections::BinaryHeap,
    env,
    error::Error,
    fs,
    io::{Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    time::{Duration, Instant, SystemTime, UNIX_EPOCH},
};

const K_VALUES: [usize; 2] = [25, 100];
const TOLERANCE: f32 = 1.0e-4;
// vec0 KNN can return at most 4096 rows in one pull (upstream cap).
const VEC0_MAX_K: usize = 4096;
// The fragment boundary repair re-ranks the captured band in the reference
// f64 metric; beyond this band size the repair degenerates into a full exact
// pass, so the vec0 fragment route is reported honestly unsupported instead.
const VEC0_REPAIR_MAX_BAND: usize = 4096;

#[derive(Clone, Debug)]
struct RowMeta {
    id: i64,
    base_index: usize,
    document: i64,
    source: i64,
    library: i64,
    kind: i64,
    item_type: i64,
    section: i64,
    tags: Vec<i64>,
    collections: Vec<i64>,
    item_refs: Vec<i64>,
}
#[derive(Clone, Debug, Default)]
struct Scope {
    library: Option<i64>,
    item_type: Option<i64>,
    item_refs: Option<Vec<i64>>,
    tags: Vec<i64>,
    collections: Vec<i64>,
    kind: Option<i64>,
    section: Option<i64>,
}
#[derive(Clone, Debug)]
struct Hit {
    id: i64,
    document: i64,
    distance: f32,
}
impl PartialEq for Hit {
    fn eq(&self, other: &Self) -> bool {
        self.id == other.id && self.distance.to_bits() == other.distance.to_bits()
    }
}
impl Eq for Hit {}
impl PartialOrd for Hit {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}
impl Ord for Hit {
    fn cmp(&self, other: &Self) -> Ordering {
        self.distance
            .total_cmp(&other.distance)
            .then_with(|| self.id.cmp(&other.id))
    }
}
#[derive(Clone)]
struct Candidate {
    id: i64,
    document: i64,
    source: i64,
    library: i64,
    kind: i64,
    section: i64,
    tags: Vec<i64>,
    collections: Vec<i64>,
    item_refs: Vec<i64>,
    vector: Vec<f32>,
    metadata: String,
}

fn main() {
    if let Err(error) = cli() {
        eprintln!("issue89: {error}");
        std::process::exit(2);
    }
}

fn cli() -> Result<(), Box<dyn Error>> {
    let args: Vec<String> = env::args().collect();
    if args.get(1).map(String::as_str) == Some("query-existing") {
        if args.len() != 9 {
            return Err("usage: issue89-benchmark query-existing <database> <queries.f32> <output.json> <dimension> <query_count> <rust|vec0> <all|fragment>".into());
        }
        let database = Path::new(&args[2]);
        if !database.is_file()
            || !matches!(args[7].as_str(), "rust" | "vec0")
            || !matches!(args[8].as_str(), "all" | "fragment")
        {
            return Err("existing query requires a database and valid engine/mode".into());
        }
        let scopes = if args[8] == "fragment" {
            vec![("all".into(), Scope::default())]
        } else {
            let db = open(database)?;
            let mut statement = db.prepare(
                "SELECT id,document_id,source_id,library_id,kind,item_type,section FROM vectors",
            )?;
            let rows = statement
                .query_map([], |row| {
                    Ok(RowMeta {
                        id: row.get(0)?,
                        base_index: 0,
                        document: row.get(1)?,
                        source: row.get(2)?,
                        library: row.get(3)?,
                        kind: row.get(4)?,
                        item_type: row.get(5)?,
                        section: row.get(6)?,
                        tags: vec![],
                        collections: vec![],
                        item_refs: vec![],
                    })
                })?
                .collect::<rusqlite::Result<Vec<_>>>()?;
            let mut rows = rows;
            for (table, field) in [("row_tags", 0), ("row_collections", 1), ("row_items", 2)] {
                let mut memberships = db.prepare(&format!("SELECT row_id,value FROM {table}"))?;
                let lookup = rows
                    .iter()
                    .enumerate()
                    .map(|(index, row)| (row.id, index))
                    .collect::<std::collections::BTreeMap<_, _>>();
                for entry in
                    memberships.query_map([], |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?)))?
                {
                    let (id, value) = entry?;
                    let row = &mut rows[*lookup.get(&id).ok_or("orphan membership")?];
                    match field {
                        0 => row.tags.push(value),
                        1 => row.collections.push(value),
                        _ => row.item_refs.push(value),
                    }
                }
            }
            build_scopes(&rows)
        };
        let (queries, correctness) = benchmark_queries(
            database,
            Path::new(&args[3]),
            args[5].parse()?,
            args[6].parse()?,
            30,
            &scopes,
            &args[7],
            args[8] == "fragment",
        )?;
        fs::write(
            &args[4],
            serde_json::to_vec_pretty(
                &json!({"queries":queries,"correctness":correctness,"queries_frozen_for_all_samples":true,"ingest":"not_repeated"}),
            )?,
        )?;
        return Ok(());
    }
    if args.get(1).map(String::as_str) == Some("--crash-probe") {
        crash_probe(Path::new(args.get(2).ok_or("missing database")?))?;
        return Ok(());
    }
    if args.len() < 6 {
        return Err("usage: issue89-benchmark <manifest.json> <output.json> <target_papers> <repeat_queries=50> <rust|vec0> [budget_gib] [scenario=all]".into());
    }
    let manifest = PathBuf::from(&args[1]);
    let output = PathBuf::from(&args[2]);
    let target_documents: usize = args[3].parse()?;
    let repeats: usize = args[4].parse()?;
    let engine = &args[5];
    let budget_gib: Option<u64> = args.get(6).map(|s| s.parse()).transpose()?;
    let scenario = env::var("ISSUE89_SCOPES")
        .ok()
        .or_else(|| args.get(7).cloned())
        .unwrap_or_else(|| "all".into());
    let fragments_only = env::var_os("ISSUE89_FRAGMENTS_ONLY").is_some();
    if repeats < 30 {
        return Err("repeat_queries must be at least 30".into());
    }
    if !matches!(engine.as_str(), "rust" | "vec0") {
        return Err("engine must be rust or vec0".into());
    }
    run_manifest(
        &manifest,
        &output,
        target_documents,
        repeats,
        engine,
        budget_gib,
        &scenario,
        fragments_only,
    )
}

fn run_manifest(
    manifest_path: &Path,
    output: &Path,
    target_documents: usize,
    repeats: usize,
    engine: &str,
    budget_gib: Option<u64>,
    scenario: &str,
    fragments_only: bool,
) -> Result<(), Box<dyn Error>> {
    let manifest: Value = serde_json::from_slice(&fs::read(manifest_path)?)?;
    let dimension = manifest["dimension"]
        .as_u64()
        .ok_or("manifest.dimension missing")? as usize;
    let query_count = manifest["query_count"]
        .as_u64()
        .ok_or("manifest.query_count missing")? as usize;
    let document_count = manifest["document_count"]
        .as_u64()
        .ok_or("manifest.document_count missing")? as usize;
    let regular_document_count = manifest
        .get("regular_document_count")
        .and_then(Value::as_u64)
        .unwrap_or(document_count as u64) as usize;
    let topic_count = manifest
        .get("topic_count")
        .and_then(Value::as_u64)
        .unwrap_or(0) as usize;
    if dimension == 0 || target_documents == 0 || query_count == 0 || document_count == 0 {
        return Err(
            "dimension, query_count, document_count, and target_documents must be positive".into(),
        );
    }
    let rows = manifest["rows"].as_array().ok_or("manifest.rows missing")?;
    if rows.is_empty() || target_documents < regular_document_count {
        return Err("target_documents is the regular paper count and must be at least regular_document_count".into());
    }
    if regular_document_count + topic_count != document_count {
        return Err("regular_document_count + topic_count must equal document_count".into());
    }
    let vectors_path = absolute_from_manifest(
        manifest_path,
        manifest["vectors_file"]
            .as_str()
            .ok_or("vectors_file missing")?,
    );
    let queries_path = absolute_from_manifest(
        manifest_path,
        manifest["queries_file"]
            .as_str()
            .ok_or("queries_file missing")?,
    );
    let vector_bytes = fs::metadata(&vectors_path)?.len();
    let query_bytes = fs::metadata(&queries_path)?.len();
    let row_width = dimension.checked_mul(4).ok_or("dimension overflow")? as u64;
    if vector_bytes != row_width * rows.len() as u64
        || query_bytes != row_width * query_count as u64
    {
        return Err("vector/query blob length does not match dimensions and row counts".into());
    }
    validate_payloads(
        &vectors_path,
        rows.len(),
        &queries_path,
        query_count,
        dimension,
    )?;
    let multiplier = target_documents.div_ceil(regular_document_count);
    let stamp = SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos();
    let run_dir = output
        .parent()
        .unwrap_or(Path::new("."))
        .join(format!("issue89-run-{stamp}"));
    fs::create_dir_all(&run_dir)?;
    let database = run_dir.join(format!("{engine}.sqlite"));
    let estimated_rows = estimate_scaled_rows(rows, target_documents, regular_document_count)?;
    let retained_vectors = row_width.saturating_mul(estimated_rows as u64);
    let budget = budget_gib.map(|g| g.saturating_mul(1024 * 1024 * 1024));
    let free = fs2_available_bytes(&run_dir)?;
    let conservative_required = retained_vectors
        .saturating_mul(if engine == "vec0" { 3 } else { 2 })
        .saturating_add(256 * 1024 * 1024);
    if budget.is_some_and(|limit| conservative_required > limit)
        || conservative_required > free.saturating_mul(3) / 4
    {
        return Err(format!("disk capacity refusal before writes: engine={engine}, estimated_required_bytes={conservative_required}, configured_experiment_budget_bytes={budget:?}, filesystem_free_bytes={free}; no database created").into());
    }
    let ingestion_start = Instant::now();
    let (metadata, real_rows, replicated_rows) =
        load_metadata(rows, target_documents, regular_document_count, topic_count)?;
    let ingest_time = if engine == "rust" {
        ingest_base(&database, &metadata, &vectors_path, dimension)?
    } else {
        ingest_vec(
            &database,
            &metadata,
            &vectors_path,
            dimension,
            estimated_rows,
        )?
    };
    let ingestion_ms = ingestion_start.elapsed().as_secs_f64() * 1000.0;
    let mut scopes = build_scopes(&metadata);
    let fragment_only = scenario.starts_with("fragment:");
    let scenario_filter = scenario.strip_prefix("fragment:").unwrap_or(scenario);
    if scenario_filter == "all-only" {
        scopes.retain(|(name, _)| name == "all");
    } else if scenario_filter != "all" && scenario != "ingest-only" {
        let requested: std::collections::BTreeSet<&str> = scenario_filter.split(',').collect();
        scopes.retain(|(name, _)| requested.contains(name.as_str()));
        if scopes.is_empty() {
            return Err(format!(
                "no scenarios matched {scenario}; available: fragment:all-only,{}",
                build_scopes(&metadata)
                    .iter()
                    .map(|(n, _)| n.as_str())
                    .collect::<Vec<_>>()
                    .join(",")
            )
            .into());
        }
    }
    if scenario == "ingest-only" {
        // Physical-space probe: build the selected engine's database and report
        // on-disk cost / ingest throughput without running any query route.
        let disk = json!({"engine":engine,"database_bytes":file_size(&database)?,"wal_bytes":sidecar_size(&database,"-wal"),"ingest_rows_per_second": replicated_rows as f64 / ingest_time.as_secs_f64().max(0.000001),"estimated_vector_bytes":retained_vectors,"preflight_required_bytes":conservative_required,"filesystem_free_before_run_bytes":free,"configured_budget_gib":budget_gib});
        let result = json!({
            "format":"issue89-benchmark-v1","scenario":"ingest-only",
            "sqlite_vec_version":"v0.1.9","sqlite_vec_commit":"e9f598abfa0c06b328d8fe5da9c3760cce74be10","sqlite_version":db_versions(&database)?.0,"vec_version":db_versions(&database)?.1,
            "dimension":dimension,"document_count":document_count,"regular_document_count":regular_document_count,"topic_count":topic_count,"target_documents":target_documents,
            "replication":{"paper_multiplier":multiplier,"source_rows":real_rows,"expanded_rows":replicated_rows},
            "ingest_wall_ms":ingestion_ms,"disk":disk,"queries":Value::Null,"correctness":Value::Null,
            "note":"ingest-only build/space probe; no query routes were executed."
        });
        fs::write(output, serde_json::to_vec_pretty(&result)?)?;
        return Ok(());
    }
    let (query_report, correctness) = benchmark_queries(
        &database,
        &queries_path,
        dimension,
        query_count,
        repeats,
        &scopes,
        engine,
        fragments_only || fragment_only,
    )?;
    let crash_rollback = crash_rollback_check(&run_dir.join("crash.sqlite"))?;
    let disk = json!({"engine":engine,"database_bytes":file_size(&database)?,"wal_bytes":sidecar_size(&database,"-wal"),"ingest_rows_per_second": replicated_rows as f64 / ingest_time.as_secs_f64().max(0.000001),"estimated_vector_bytes":retained_vectors,"preflight_required_bytes":conservative_required,"filesystem_free_before_run_bytes":free,"configured_budget_gib":budget_gib});
    let result = json!({
        "format":"issue89-benchmark-v1", "sqlite_vec_version":"v0.1.9", "sqlite_vec_commit":"e9f598abfa0c06b328d8fe5da9c3760cce74be10","sqlite_version":db_versions(&database)?.0,"vec_version":db_versions(&database)?.1,
        "dimension":dimension,"document_count":document_count,"regular_document_count":regular_document_count,"topic_count":topic_count,"target_documents":target_documents,"scale_unit":"regular_papers_topics_held_constant","replication":{"mode":if target_documents > regular_document_count {"replicated_pressure"} else {"none"},"paper_multiplier":multiplier,"source_rows":real_rows,"expanded_rows":replicated_rows},
        "query_count":query_count,"repeat_queries":repeats,"k":[25,100],"selected_scenarios":scenario,"fragments_only":fragments_only||fragment_only,"ingest_wall_ms":ingestion_ms,"disk":disk,"queries":query_report,"correctness":correctness,"transaction_probe":{"process_exit_rollback":crash_rollback,"fixture_only":true},
        "upstream_build_warnings":["sqlite-vec v0.1.9 C compilation reports possible uninitialized n/offset warnings; upstream source was not modified."],
        "limitations":["Isolated fixture only; not a production owner or lifecycle proof.","Only the selected engine is materialized in each run; compare engines in separate invocations.","Complex vec0 scopes use rowid IN with the full relational eligible-ID set; predicate enumeration is included in query latency.","Exact vec0 fragment and document routes require the complete eligible set to fit in one pull (<=4096 rows), followed by f64-reference reranking. Larger sets use the already timed Rust exact scan as fallback. Raw KNN and bounded-band reranking are exploratory, even when a measured query happens to agree.","sqlite-vec accumulates cosine in float32 while the reference accumulates in float64 and casts to float32. Near-equal scores can reverse identities; distance tolerance does not make different ranked identities equivalent.","Replica pressure preserves vectors and changes identities; it is not real independent-document quality data.","Peak RSS is process-wide VmHWM and includes the benchmark harness."]
    });
    fs::write(output, serde_json::to_vec_pretty(&result)?)?;
    Ok(())
}

fn fs2_available_bytes(path: &Path) -> Result<u64, Box<dyn Error>> {
    let out = std::process::Command::new("df")
        .args(["-Pk", path.to_str().ok_or("non-UTF8 run path")?])
        .output()?;
    if !out.status.success() {
        return Err("df could not inspect benchmark filesystem capacity".into());
    }
    let text = String::from_utf8(out.stdout)?;
    let available = text
        .lines()
        .nth(1)
        .and_then(|line| line.split_whitespace().nth(3))
        .ok_or("cannot parse df capacity")?
        .parse::<u64>()?;
    Ok(available.saturating_mul(1024))
}

fn absolute_from_manifest(manifest: &Path, file: &str) -> PathBuf {
    let path = PathBuf::from(file);
    if path.is_absolute() {
        path
    } else {
        manifest.parent().unwrap_or(Path::new(".")).join(path)
    }
}
fn validate_payloads(
    vectors: &Path,
    vector_count: usize,
    queries: &Path,
    query_count: usize,
    dimension: usize,
) -> Result<(), Box<dyn Error>> {
    for (path, count) in [(vectors, vector_count), (queries, query_count)] {
        let mut file = fs::File::open(path)?;
        let mut raw = vec![0u8; dimension * 4];
        for index in 0..count {
            file.read_exact(&mut raw)?;
            let values: Vec<f32> = raw
                .chunks_exact(4)
                .map(|b| f32::from_le_bytes(b.try_into().unwrap()))
                .collect();
            validate_vector(&values, dimension).map_err(|e| {
                format!(
                    "invalid vector payload {} at row {index}: {e}",
                    path.display()
                )
            })?;
        }
    }
    Ok(())
}

fn estimate_scaled_rows(
    rows: &[Value],
    target_regular: usize,
    regular_count: usize,
) -> Result<usize, Box<dyn Error>> {
    let mut regular = std::collections::BTreeSet::new();
    let mut topics = std::collections::BTreeSet::new();
    for row in rows {
        if integer(row, "kind")? < 3 {
            regular.insert(integer(row, "document")?);
        } else {
            topics.insert(integer(row, "document")?);
        }
    }
    if regular.len() != regular_count {
        return Err("regular_document_count does not match rows".into());
    }
    let ids: Vec<i64> = regular.iter().copied().collect();
    let map: std::collections::BTreeMap<i64, usize> =
        ids.iter().enumerate().map(|(i, id)| (*id, i)).collect();
    let copied = rows
        .iter()
        .filter(|r| r["kind"].as_i64().unwrap_or(3) < 3)
        .try_fold(0usize, |sum, row| {
            let doc = integer(row, "document")?;
            let n = target_regular
                .saturating_sub(map[&doc])
                .div_ceil(regular_count);
            Ok::<_, Box<dyn Error>>(sum + n)
        })?;
    Ok(copied
        + rows
            .iter()
            .filter(|r| r["kind"].as_i64().unwrap_or(0) >= 3)
            .count())
}

fn load_metadata(
    rows: &[Value],
    target_regular: usize,
    regular_count: usize,
    declared_topics: usize,
) -> Result<(Vec<RowMeta>, usize, usize), Box<dyn Error>> {
    let mut base = Vec::with_capacity(rows.len());
    let mut paper_docs = std::collections::BTreeSet::new();
    let mut topics = std::collections::BTreeSet::new();
    for (index, row) in rows.iter().enumerate() {
        let document = integer(row, "document")?;
        let kind = integer(row, "kind")?;
        if kind < 3 {
            paper_docs.insert(document);
        } else {
            topics.insert(document);
        }
        base.push(RowMeta {
            id: index as i64 + 1,
            base_index: index,
            document,
            source: integer(row, "source")?,
            library: integer(row, "library")?,
            kind,
            item_type: row.get("item_type").and_then(Value::as_i64).unwrap_or(0),
            section: row.get("section").and_then(Value::as_i64).unwrap_or(0),
            tags: integer_array(row, "tags")?,
            collections: integer_array(row, "collections")?,
            item_refs: row
                .get("item_refs")
                .map(|_| integer_array(row, "item_refs"))
                .transpose()?
                .unwrap_or_default(),
        });
    }
    if paper_docs.len() != regular_count || topics.len() != declared_topics {
        return Err(format!("manifest says {regular_count} regular papers and {declared_topics} topics, rows contain {} and {}",paper_docs.len(),topics.len()).into());
    }
    let paper_ids: Vec<i64> = paper_docs.iter().copied().collect();
    let topic_ids: Vec<i64> = topics.iter().copied().collect();
    let paper_map: std::collections::BTreeMap<i64, usize> = paper_ids
        .iter()
        .enumerate()
        .map(|(i, id)| (*id, i))
        .collect();
    let topic_map: std::collections::BTreeMap<i64, usize> = topic_ids
        .iter()
        .enumerate()
        .map(|(i, id)| (*id, i))
        .collect();
    let copies = target_regular.div_ceil(regular_count);
    let mut all = Vec::with_capacity(base.len() * copies);
    let source_offset = base.iter().map(|r| r.source).max().unwrap_or(0) + 1;
    let item_offset = base
        .iter()
        .flat_map(|r| r.item_refs.iter())
        .copied()
        .max()
        .unwrap_or(0)
        + 1;
    for copy in 0..copies {
        for original in &base {
            if original.kind < 3
                && copy * regular_count + paper_map[&original.document] >= target_regular
            {
                continue;
            }
            if original.kind >= 3 && copy > 0 {
                continue;
            }
            let mut row = original.clone();
            row.id = all.len() as i64 + 1;
            if original.kind < 3 {
                row.document = (copy * regular_count + paper_map[&original.document]) as i64;
            } else {
                row.document = (target_regular + topic_map[&original.document]) as i64;
            }
            if copy > 0 && original.kind < 3 {
                row.source += copy as i64 * source_offset;
                row.item_refs = row
                    .item_refs
                    .iter()
                    .map(|n| n + copy as i64 * item_offset)
                    .collect();
            }
            all.push(row);
        }
    }
    let expanded_len = all.len();
    Ok((all, rows.len(), expanded_len))
}

fn integer(v: &Value, key: &str) -> Result<i64, Box<dyn Error>> {
    v.get(key)
        .and_then(Value::as_i64)
        .ok_or_else(|| format!("row.{key} must be an integer").into())
}
fn integer_array(v: &Value, key: &str) -> Result<Vec<i64>, Box<dyn Error>> {
    v.get(key)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("row.{key} must be an integer array"))?
        .iter()
        .map(|x| {
            x.as_i64()
                .ok_or_else(|| format!("row.{key} contains a non-integer").into())
        })
        .collect()
}

fn init_sqlite_vec() -> Result<(), String> {
    static ONCE: std::sync::OnceLock<Result<(), String>> = std::sync::OnceLock::new();
    ONCE.get_or_init(|| unsafe {
        let rc = rusqlite::ffi::sqlite3_auto_extension(Some(sqlite3_vec_init));
        if rc == rusqlite::ffi::SQLITE_OK {
            Ok(())
        } else {
            Err(format!("sqlite3_auto_extension failed with {rc}"))
        }
    })
    .clone()
}
unsafe extern "C" {
    fn sqlite3_vec_init(
        db: *mut rusqlite::ffi::sqlite3,
        error: *mut *mut i8,
        api: *const rusqlite::ffi::sqlite3_api_routines,
    ) -> i32;
}
fn open(path: impl AsRef<Path>) -> Result<Connection, Box<dyn Error>> {
    init_sqlite_vec().map_err(|e| -> Box<dyn Error> { e.into() })?;
    Ok(Connection::open(path)?)
}
fn open_memory() -> Connection {
    init_sqlite_vec().unwrap();
    Connection::open_in_memory().unwrap()
}

fn create_relational_schema(db: &Connection) -> rusqlite::Result<()> {
    db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; CREATE TABLE IF NOT EXISTS vectors(id INTEGER PRIMARY KEY, document_id INTEGER NOT NULL, source_id INTEGER NOT NULL, library_id INTEGER NOT NULL, kind INTEGER NOT NULL, item_type INTEGER NOT NULL DEFAULT 0, section INTEGER NOT NULL, vector BLOB NOT NULL); CREATE TABLE IF NOT EXISTS row_tags(row_id INTEGER NOT NULL, value INTEGER NOT NULL, PRIMARY KEY(row_id,value)); CREATE INDEX IF NOT EXISTS tags_value_row ON row_tags(value,row_id); CREATE TABLE IF NOT EXISTS row_collections(row_id INTEGER NOT NULL, value INTEGER NOT NULL, PRIMARY KEY(row_id,value)); CREATE INDEX IF NOT EXISTS collections_value_row ON row_collections(value,row_id); CREATE TABLE IF NOT EXISTS row_items(row_id INTEGER NOT NULL, value INTEGER NOT NULL, PRIMARY KEY(row_id,value)); CREATE INDEX IF NOT EXISTS items_value_row ON row_items(value,row_id); CREATE TABLE IF NOT EXISTS source_metadata(source_id INTEGER PRIMARY KEY, value TEXT NOT NULL); CREATE TABLE IF NOT EXISTS active_build(id TEXT PRIMARY KEY); CREATE TABLE IF NOT EXISTS staged_vectors(build_id TEXT NOT NULL, row_id INTEGER NOT NULL, vector BLOB NOT NULL, PRIMARY KEY(build_id,row_id)); INSERT OR IGNORE INTO active_build(id) VALUES('initial');")
}

fn create_vec_schema(db: &Connection, dimension: usize) -> rusqlite::Result<()> {
    create_relational_schema(db)?;
    db.execute_batch(&format!("CREATE VIRTUAL TABLE vectors_vec USING vec0(embedding float[{dimension}] distance_metric=cosine, library_id INTEGER, kind INTEGER, item_type INTEGER, section INTEGER, +document_id INTEGER);"))?;
    Ok(())
}

fn candidate_vec(path: &Path, offset: u64, dimension: usize) -> Result<Vec<f32>, Box<dyn Error>> {
    let mut file = fs::File::open(path)?;
    file.seek(SeekFrom::Start(offset))?;
    let mut bytes = vec![0u8; dimension * 4];
    file.read_exact(&mut bytes)?;
    let values: Vec<f32> = bytes
        .chunks_exact(4)
        .map(|b| f32::from_le_bytes(b.try_into().unwrap()))
        .collect();
    validate_vector(&values, dimension)?;
    Ok(values)
}

fn ingest_base(
    path: &Path,
    metadata: &[RowMeta],
    vectors: &Path,
    dimension: usize,
) -> Result<Duration, Box<dyn Error>> {
    let mut db = open(path)?;
    create_relational_schema(&db)?;
    let start = Instant::now();
    for (batch_index, batch) in metadata.chunks(128).enumerate() {
        let tx = db.transaction()?;
        for row in batch {
            let vector = candidate_vec(
                vectors,
                row.base_index as u64 * dimension as u64 * 4,
                dimension,
            )?;
            let encoded = encode_vector(&vector);
            tx.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,item_type,section,vector) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)", params![row.id,row.document,row.source,row.library,row.kind,row.item_type,row.section,encoded])?;
            write_memberships(&tx, row, row.id, 0)?;
        }
        tx.commit()?;
        if batch_index % 128 == 127 {
            eprintln!(
                "{}",
                json!({"phase":"ingest","engine":"rust","rows":(batch_index+1)*128,"total":metadata.len()})
            );
        }
    }
    Ok(start.elapsed())
}

fn ingest_vec(
    path: &Path,
    metadata: &[RowMeta],
    vectors: &Path,
    dimension: usize,
    expected_rows: usize,
) -> Result<Duration, Box<dyn Error>> {
    let mut db = open(path)?;
    create_vec_schema(&db, dimension)?;
    let start = Instant::now();
    if metadata.len() != expected_rows {
        return Err(format!(
            "scaled row count drift: {} != {expected_rows}",
            metadata.len()
        )
        .into());
    }
    for (batch_index, batch) in metadata.chunks(128).enumerate() {
        let tx = db.transaction()?;
        for row in batch {
            let vector = candidate_vec(
                vectors,
                row.base_index as u64 * dimension as u64 * 4,
                dimension,
            )?;
            tx.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,item_type,section,vector) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",params![row.id,row.document,row.source,row.library,row.kind,row.item_type,row.section,encode_vector(&vector)])?;
            tx.execute("INSERT INTO vectors_vec(rowid,embedding,library_id,kind,item_type,section,document_id) VALUES(?1,?2,?3,?4,?5,?6,?7)",params![row.id,encode_vector(&vector),row.library,row.kind,row.item_type,row.section,row.document])?;
            write_memberships(&tx, row, row.id, 0)?;
        }
        tx.commit()?;
        if batch_index % 128 == 127 {
            eprintln!(
                "{}",
                json!({"phase":"ingest","engine":"vec0","rows":(batch_index+1)*128,"total":metadata.len()})
            );
        }
    }
    Ok(start.elapsed())
}

fn write_memberships(
    tx: &rusqlite::Transaction<'_>,
    row: &RowMeta,
    id: i64,
    identity_offset: usize,
) -> rusqlite::Result<()> {
    for tag in &row.tags {
        tx.execute("INSERT INTO row_tags VALUES(?1,?2)", params![id, tag])?;
    }
    for collection in &row.collections {
        tx.execute(
            "INSERT INTO row_collections VALUES(?1,?2)",
            params![id, collection],
        )?;
    }
    for item in &row.item_refs {
        tx.execute(
            "INSERT INTO row_items VALUES(?1,?2)",
            params![id, item + identity_offset as i64],
        )?;
    }
    Ok(())
}

fn validate_vector(v: &[f32], dimension: usize) -> Result<(), Box<dyn Error>> {
    if v.len() != dimension {
        return Err(format!("vector dimension {} differs from {dimension}", v.len()).into());
    }
    if v.iter().any(|x| !x.is_finite()) {
        return Err("vector contains NaN or infinity".into());
    }
    let norm: f64 = v.iter().map(|x| (*x as f64) * (*x as f64)).sum();
    if norm == 0.0 {
        return Err("zero vector has undefined cosine distance".into());
    }
    Ok(())
}

// Reference cosine, hoisted and allocation-free.
//
// The exact oracle used to validate and re-rank every row on every query. The
// query's own validation and ||q||^2 are computed once per scan (not once per
// row), and each stored row is streamed straight from its BLOB with a single
// fused f64 pass (dot + ||b||^2). No per-row Vec<f32> decode, no per-row
// re-validation, no per-row allocation: memory is bounded by the top-k heap
// plus one borrowed row. The arithmetic is bit-for-bit the same f64
// dot/(|a||b|) reference the benchmark oracle is defined against; only the
// redundant work is removed. Zero / non-finite stored vectors are still
// rejected, preserving the cosine contract.
struct QueryPlan {
    values: Vec<f32>,
    norm_sq: f64,
}
impl QueryPlan {
    fn new(query: &[f32], dimension: usize) -> Result<Self, Box<dyn Error>> {
        validate_vector(query, dimension)?;
        let norm_sq = query.iter().map(|x| (*x as f64) * (*x as f64)).sum();
        Ok(Self {
            values: query.to_vec(),
            norm_sq,
        })
    }
    fn dimension(&self) -> usize {
        self.values.len()
    }
}

fn reference_cosine_blob(
    query: &QueryPlan,
    blob: &[u8],
    dimension: usize,
) -> Result<f32, Box<dyn Error>> {
    if blob.len() != dimension * 4 {
        return Err("stored vector BLOB has wrong dimension".into());
    }
    let mut dot = 0f64;
    let mut norm_sq = 0f64;
    for (i, chunk) in blob.chunks_exact(4).enumerate() {
        let y = f32::from_le_bytes(chunk.try_into().unwrap()) as f64;
        let x = query.values[i] as f64;
        dot += x * y;
        norm_sq += y * y;
    }
    if norm_sq == 0.0 || !norm_sq.is_finite() {
        return Err("stored vector has zero or non-finite norm".into());
    }
    let denom = query.norm_sq.sqrt() * norm_sq.sqrt();
    if denom == 0.0 || !denom.is_finite() {
        return Err("cosine denominator is zero or non-finite".into());
    }
    let distance = 1.0 - dot / denom;
    if !distance.is_finite() {
        return Err("cosine distance is non-finite".into());
    }
    Ok(distance as f32)
}

fn cosine_distance(a: &[f32], b: &[f32]) -> Result<f32, Box<dyn Error>> {
    validate_vector(a, a.len())?;
    validate_vector(b, b.len())?;
    if a.len() != b.len() {
        return Err("vector dimension mismatch".into());
    }
    let (mut dot, mut an, mut bn) = (0f64, 0f64, 0f64);
    for (x, y) in a.iter().zip(b) {
        let (x, y) = (*x as f64, *y as f64);
        dot += x * y;
        an += x * x;
        bn += y * y;
    }
    Ok((1.0 - dot / (an.sqrt() * bn.sqrt())) as f32)
}
fn encode_vector(v: &[f32]) -> Vec<u8> {
    v.iter().flat_map(|x| x.to_le_bytes()).collect()
}
fn decode_vector(bytes: &[u8], dimension: usize) -> Result<Vec<f32>, Box<dyn Error>> {
    if bytes.len() != dimension * 4 {
        return Err("stored vector BLOB has wrong dimension".into());
    }
    let result: Vec<f32> = bytes
        .chunks_exact(4)
        .map(|b| f32::from_le_bytes(b.try_into().unwrap()))
        .collect();
    validate_vector(&result, dimension)?;
    Ok(result)
}
fn rank(hits: Vec<Hit>, k: usize) -> Vec<Hit> {
    let mut heap = BinaryHeap::with_capacity(k + 1);
    for hit in hits {
        keep_topk(&mut heap, hit, k);
    }
    sorted_hits(heap)
}
fn keep_topk(heap: &mut BinaryHeap<Hit>, hit: Hit, k: usize) {
    if k == 0 {
        return;
    }
    if heap.len() < k {
        heap.push(hit);
    } else if heap.peek().is_some_and(|worst| hit < *worst) {
        heap.pop();
        heap.push(hit);
    }
}
fn sorted_hits(heap: BinaryHeap<Hit>) -> Vec<Hit> {
    let mut hits = heap.into_vec();
    hits.sort_by(|a, b| a.cmp(b));
    hits
}
fn aggregate_documents(fragments: Vec<Hit>, k: usize) -> Vec<Hit> {
    let mut best = std::collections::BTreeMap::<i64, Hit>::new();
    for hit in fragments {
        best.entry(hit.document)
            .and_modify(|current| {
                if hit
                    .distance
                    .total_cmp(&current.distance)
                    .then(hit.id.cmp(&current.id))
                    .is_lt()
                {
                    *current = hit.clone();
                }
            })
            .or_insert(hit);
    }
    rank(best.into_values().collect(), k)
}

fn scope_sql(scope: &Scope, alias: &str) -> (String, Vec<i64>) {
    let mut clauses = Vec::new();
    let mut values = Vec::new();
    if let Some(x) = scope.library {
        clauses.push(format!("{alias}.library_id=?"));
        values.push(x);
    }
    if let Some(x) = scope.item_type {
        clauses.push(format!("{alias}.item_type=?"));
        values.push(x);
    }
    if let Some(x) = scope.kind {
        clauses.push(format!("{alias}.kind=?"));
        values.push(x);
    }
    if let Some(x) = scope.section {
        clauses.push(format!("{alias}.section=?"));
        values.push(x);
    }
    if let Some(items) = &scope.item_refs {
        if items.is_empty() {
            clauses.push("0".into());
        } else {
            clauses.push(format!(
                "EXISTS(SELECT 1 FROM row_items m WHERE m.row_id={alias}.id AND m.value IN ({}))",
                vec!["?"; items.len()].join(",")
            ));
            values.extend(items.iter().copied());
        }
    }
    for (table, list) in [
        ("row_tags", &scope.tags),
        ("row_collections", &scope.collections),
    ] {
        if !list.is_empty() {
            clauses.push(format!(
                "EXISTS(SELECT 1 FROM {table} m WHERE m.row_id={alias}.id AND m.value IN ({}))",
                vec!["?"; list.len()].join(",")
            ));
            values.extend(list.iter().copied());
        }
    }
    (
        if clauses.is_empty() {
            "1".into()
        } else {
            clauses.join(" AND ")
        },
        values,
    )
}
fn eligible_ids(rows: &[RowMeta], scope: &Scope) -> Vec<i64> {
    rows.iter()
        .filter(|r| row_matches(r, scope))
        .map(|r| r.id)
        .collect()
}
fn row_matches(row: &RowMeta, scope: &Scope) -> bool {
    scope.library.is_none_or(|x| row.library == x)
        && scope.item_type.is_none_or(|x| row.item_type == x)
        && scope.kind.is_none_or(|x| row.kind == x)
        && scope.section.is_none_or(|x| row.section == x)
        && scope
            .item_refs
            .as_ref()
            .is_none_or(|items| items.iter().any(|x| row.item_refs.contains(x)))
        && (scope.tags.is_empty() || scope.tags.iter().any(|x| row.tags.contains(x)))
        && (scope.collections.is_empty()
            || scope
                .collections
                .iter()
                .any(|x| row.collections.contains(x)))
}

fn build_scopes(rows: &[RowMeta]) -> Vec<(String, Scope)> {
    let mut result = vec![
        ("all".into(), Scope::default()),
        (
            "library".into(),
            Scope {
                library: rows.first().map(|r| r.library),
                ..Scope::default()
            },
        ),
        (
            "empty".into(),
            Scope {
                library: Some(i64::MIN),
                ..Scope::default()
            },
        ),
        (
            "empty_item_refs".into(),
            Scope {
                item_refs: Some(vec![]),
                ..Scope::default()
            },
        ),
        (
            "kind".into(),
            Scope {
                kind: Some(1),
                ..Scope::default()
            },
        ),
        (
            "item_type".into(),
            Scope {
                item_type: rows.iter().find(|r| r.item_type != 0).map(|r| r.item_type),
                ..Scope::default()
            },
        ),
    ];
    let rare = |f: fn(&RowMeta) -> &Vec<i64>| {
        rows.iter()
            .flat_map(f)
            .fold(
                std::collections::BTreeMap::<i64, usize>::new(),
                |mut m, x| {
                    *m.entry(*x).or_default() += 1;
                    m
                },
            )
            .into_iter()
            .min_by_key(|(_, n)| *n)
            .map(|(x, _)| x)
    };
    if let Some(x) = rare(|r| &r.item_refs) {
        result.push((
            "rare_item_ref".into(),
            Scope {
                item_refs: Some(vec![x]),
                ..Scope::default()
            },
        ));
    }
    if let Some(x) = rare(|r| &r.tags) {
        result.push((
            "tag".into(),
            Scope {
                tags: vec![x],
                ..Scope::default()
            },
        ));
    }
    if let Some(x) = rare(|r| &r.collections) {
        result.push((
            "collection".into(),
            Scope {
                collections: vec![x],
                ..Scope::default()
            },
        ));
    }
    if let Some(r) = rows.iter().find(|r| r.kind == 3) {
        result.push((
            "topic_section".into(),
            Scope {
                kind: Some(3),
                section: Some(r.section),
                ..Scope::default()
            },
        ));
    }
    result
}

fn rust_scan(
    db: &Connection,
    query: &[f32],
    scope: &Scope,
    k: usize,
    dimension: usize,
) -> Result<(Vec<Hit>, usize), Box<dyn Error>> {
    let plan = QueryPlan::new(query, dimension)?;
    let (where_sql, values) = scope_sql(scope, "v");
    let sql = format!("SELECT v.id,v.document_id,v.vector FROM vectors v WHERE {where_sql}");
    let mut stmt = db.prepare(&sql)?;
    let mut rows = stmt.query(rusqlite::params_from_iter(values.iter()))?;
    let mut heap = BinaryHeap::with_capacity(k + 1);
    let mut count = 0;
    while let Some(row) = rows.next()? {
        let id: i64 = row.get(0)?;
        let document: i64 = row.get(1)?;
        let distance = {
            let blob = match row.get_ref(2)? {
                rusqlite::types::ValueRef::Blob(b) => b,
                _ => return Err("vectors.vector must be a BLOB".into()),
            };
            reference_cosine_blob(&plan, blob, dimension)?
        };
        keep_topk(
            &mut heap,
            Hit {
                id,
                document,
                distance,
            },
            k,
        );
        count += 1;
    }
    Ok((sorted_hits(heap), count))
}
fn rust_document_scan(
    db: &Connection,
    query: &[f32],
    scope: &Scope,
    k: usize,
    dimension: usize,
) -> Result<Vec<Hit>, Box<dyn Error>> {
    let plan = QueryPlan::new(query, dimension)?;
    let (where_sql, values) = scope_sql(scope, "v");
    let sql = format!("SELECT v.id,v.document_id,v.vector FROM vectors v WHERE {where_sql}");
    let mut stmt = db.prepare(&sql)?;
    let mut rows = stmt.query(rusqlite::params_from_iter(values.iter()))?;
    let mut best = std::collections::BTreeMap::<i64, Hit>::new();
    while let Some(row) = rows.next()? {
        let id: i64 = row.get(0)?;
        let document: i64 = row.get(1)?;
        let blob = match row.get_ref(2)? {
            rusqlite::types::ValueRef::Blob(b) => b,
            _ => return Err("vectors.vector must be a BLOB".into()),
        };
        let hit = Hit {
            id,
            document,
            distance: reference_cosine_blob(&plan, blob, dimension)?,
        };
        best.entry(document)
            .and_modify(|current| {
                if hit < *current {
                    *current = hit.clone()
                }
            })
            .or_insert(hit);
    }
    Ok(rank(best.into_values().collect(), k))
}
fn scalar_scan(
    db: &Connection,
    query: &[f32],
    scope: &Scope,
    k: usize,
) -> Result<(Vec<Hit>, usize), Box<dyn Error>> {
    let (where_sql, mut values) = scope_sql(scope, "v");
    let sql = format!(
        "SELECT v.id,v.document_id,vec_distance_cosine(v.vector,?) FROM vectors v WHERE {where_sql} ORDER BY 3,v.id LIMIT ?"
    );
    values.push(k as i64);
    let mut args = vec![rusqlite::types::Value::Blob(encode_vector(query))];
    args.extend(values.into_iter().map(rusqlite::types::Value::Integer));
    let mut stmt = db.prepare(&sql)?;
    let hits = stmt
        .query_map(rusqlite::params_from_iter(args.iter()), |r| {
            Ok(Hit {
                id: r.get(0)?,
                document: r.get(1)?,
                distance: r.get(2)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    let count: i64 = db.query_row(
        &format!("SELECT COUNT(*) FROM vectors v WHERE {where_sql}"),
        rusqlite::params_from_iter(args.iter().skip(1).take(args.len() - 2)),
        |r| r.get(0),
    )?;
    Ok((hits, count as usize))
}
fn scalar_document_scan(
    db: &Connection,
    query: &[f32],
    scope: &Scope,
    k: usize,
) -> Result<Vec<Hit>, Box<dyn Error>> {
    let (where_sql, values) = scope_sql(scope, "v");
    let sql = format!(
        "WITH distances AS MATERIALIZED (SELECT v.id AS id,v.document_id AS document_id,vec_distance_cosine(v.vector,?) AS distance FROM vectors v WHERE {where_sql}) , ranked AS (SELECT id,document_id,distance,ROW_NUMBER() OVER(PARTITION BY document_id ORDER BY distance,id) AS n FROM distances) SELECT id,document_id,distance FROM ranked WHERE n=1 ORDER BY distance,id LIMIT ?"
    );
    // vec_distance_cosine is evaluated once per eligible row in the
    // MATERIALIZED `distances` CTE; the window function and the final sort reuse
    // the stored scalar `distance` column. The temp table holds only (id,
    // document_id, distance) scalars per row - no vector buffers.
    let mut args = vec![rusqlite::types::Value::Blob(encode_vector(query))];
    args.extend(values.into_iter().map(Into::into));
    args.push((k as i64).into());
    Ok(db
        .prepare(&sql)?
        .query_map(rusqlite::params_from_iter(args.iter()), |r| {
            Ok(Hit {
                id: r.get(0)?,
                document: r.get(1)?,
                distance: r.get(2)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?)
}

// Raw vec0 KNN pull: returns up to `pull` rows nearest by vec0's own float32
// kernel distance, ordered by (distance, rowid). `pull` must be <= 4096.
// sqlite-vec accumulates cosine in f32, so its ranking can differ from the
// f64 reference. Reranking is exact only when the complete eligible set was
// pulled; reranking a bounded candidate band remains exploratory.
fn vec0_knn_raw(
    db: &Connection,
    query: &[f32],
    scope: &Scope,
    pull: usize,
) -> Result<Vec<Hit>, Box<dyn Error>> {
    if pull == 0 || pull > VEC0_MAX_K {
        return Err("vec0 pull size must be within 1..=4096".into());
    }
    let (scope_where, scope_values) = scope_sql(scope, "v");
    let sql = format!(
        "WITH knn AS MATERIALIZED (SELECT rowid,distance,document_id FROM vectors_vec WHERE embedding MATCH ? AND k = ? AND rowid IN (SELECT v.id FROM vectors v WHERE {scope_where}) ORDER BY distance) SELECT rowid,distance,document_id FROM knn ORDER BY distance,rowid"
    );
    let mut args = vec![
        rusqlite::types::Value::Blob(encode_vector(query)),
        rusqlite::types::Value::Integer(pull as i64),
    ];
    args.extend(scope_values.into_iter().map(Into::into));
    Ok(db
        .prepare(&sql)?
        .query_map(rusqlite::params_from_iter(args.iter()), |r| {
            Ok(Hit {
                id: r.get(0)?,
                distance: r.get(1)?,
                document: r.get(2)?,
            })
        })?
        .collect::<rusqlite::Result<Vec<_>>>()?)
}

// Re-rank a vec0 candidate band in the exact reference metric.
//
// vec0 returns approximate f32 distances; the identity contract is defined by
// the Rust f64 cosine cast to f32, ordered by (distance, rowid). This fetches
// each candidate's stored float32 vector and recomputes the reference distance
// (streaming, allocation-free), then returns the band's stable top-k. The
// caller may claim global exactness only for a full eligible pull; capturing
// the f32 boundary does not prove coverage of the f64 reference top-k. This
// reranking cost is measured separately from the KNN pull.
fn reference_rerank(
    db: &Connection,
    plan: &QueryPlan,
    band: &[Hit],
    k: usize,
) -> Result<Vec<Hit>, Box<dyn Error>> {
    let mut lookup = db.prepare("SELECT vector FROM vectors WHERE id=?1")?;
    let mut hits = Vec::with_capacity(band.len());
    for row in band {
        let blob: Vec<u8> = lookup.query_row([row.id], |r| r.get(0))?;
        hits.push(Hit {
            id: row.id,
            document: row.document,
            distance: reference_cosine_blob(plan, &blob, plan.dimension())?,
        });
    }
    Ok(rank(hits, k))
}

struct Vec0Candidate {
    hits: Vec<Hit>,
    knn_ms: f64,
    repair_ms: f64,
    pull_rows: usize,
    boundary_captured: bool,
    reference_exact: bool,
}

// vec0 fragment candidate: raw f32-kernel KNN plus a reference-metric re-rank
// of whatever band was pulled. This is an EXPLORATORY metric, never an exact
// oracle.
//
// `reference_exact` is true ONLY when the entire eligible set was pulled and
// re-ranked in the f64 reference metric (i.e. eligible <= 4096). Capturing the
// vec0 f32 boundary tie group is NOT sufficient for reference exactness: the
// f32 kernel can invert the f64 ordering of near-boundary rows that lie outside
// the captured band, and no rigorous kernel error bound is established here.
// A `reference_exact == false` candidate is reported for cost/observability
// and checked against the oracle, but is never presented as exact.
fn vec0_fragment_candidate(
    db: &Connection,
    query: &[f32],
    scope: &Scope,
    k: usize,
    eligible: i64,
    dimension: usize,
) -> Result<Option<Vec0Candidate>, Box<dyn Error>> {
    if eligible == 0 || k == 0 {
        return Ok(Some(Vec0Candidate {
            hits: Vec::new(),
            knn_ms: 0.0,
            repair_ms: 0.0,
            pull_rows: 0,
            boundary_captured: true,
            reference_exact: true,
        }));
    }
    if k > VEC0_MAX_K {
        return Ok(None);
    }
    let plan = QueryPlan::new(query, dimension)?;
    let target = k.min(eligible as usize);
    let knn_start = Instant::now();
    let pull_rows;
    let mut boundary_captured;
    let reference_exact;
    let mut band;
    if eligible <= VEC0_MAX_K as i64 {
        // Provable path: pull the entire eligible set and re-rank it in the
        // reference metric. This is the only vec0 fragment route that may be
        // treated as exact.
        pull_rows = eligible as usize;
        band = vec0_knn_raw(db, query, scope, pull_rows)?;
        boundary_captured = true;
        reference_exact = true;
    } else {
        // Exploratory path: bounded growing band. `boundary_captured` records
        // whether the vec0 f32 tie group at the k-th distance was fully pulled
        // (last pulled distance strictly greater than the k-th distance), which
        // keeps the exploratory candidate's identity stable with respect to the
        // f32 kernel. It does NOT establish reference exactness.
        let mut pull = target.saturating_add(64).min(VEC0_REPAIR_MAX_BAND);
        band = vec0_knn_raw(db, query, scope, pull)?;
        boundary_captured = false;
        loop {
            let d_boundary = band[target - 1].distance;
            if band[band.len() - 1].distance.total_cmp(&d_boundary) == Ordering::Greater {
                boundary_captured = true;
                break;
            }
            if pull >= VEC0_REPAIR_MAX_BAND {
                break;
            }
            pull = (pull * 2).min(VEC0_REPAIR_MAX_BAND);
            band = vec0_knn_raw(db, query, scope, pull)?;
        }
        pull_rows = band.len();
        reference_exact = false;
    }
    let knn_ms = knn_start.elapsed().as_secs_f64() * 1000.0;
    let repair_start = Instant::now();
    let hits = reference_rerank(db, &plan, &band, target)?;
    let repair_ms = repair_start.elapsed().as_secs_f64() * 1000.0;
    Ok(Some(Vec0Candidate {
        hits,
        knn_ms,
        repair_ms,
        pull_rows,
        boundary_captured,
        reference_exact,
    }))
}

// vec0 full-eligible document aggregation, exact when the eligible fragment
// set fits in one vec0 pull (eligible <= 4096). The entire eligible set is
// pulled, re-ranked in the reference metric, reduced to each document's best
// fragment, then ranked. When eligible > 4096 vec0 cannot enumerate the full
// eligible set in one KNN, so this route reports honestly unsupported rather
// than approximating.
fn vec0_document_topk(
    db: &Connection,
    query: &[f32],
    scope: &Scope,
    k: usize,
    eligible: i64,
    dimension: usize,
) -> Result<Option<Vec<Hit>>, Box<dyn Error>> {
    if eligible == 0 {
        return Ok(Some(Vec::new()));
    }
    if eligible > VEC0_MAX_K as i64 {
        return Ok(None);
    }
    let plan = QueryPlan::new(query, dimension)?;
    let band = vec0_knn_raw(db, query, scope, eligible as usize)?;
    let ranked = reference_rerank(db, &plan, &band, band.len())?;
    Ok(Some(aggregate_documents(ranked, k)))
}

fn benchmark_queries(
    db_path: &Path,
    queries_path: &Path,
    dimension: usize,
    query_count: usize,
    repeats: usize,
    scopes: &[(String, Scope)],
    engine: &str,
    fragment_only: bool,
) -> Result<(Value, Value), Box<dyn Error>> {
    let db = open(db_path)?;
    let query_bytes = fs::read(queries_path)?;
    let stride = dimension.checked_mul(4).ok_or("query dimension overflow")?;
    let expected_bytes = query_count
        .checked_mul(stride)
        .ok_or("query count overflow")?;
    if stride == 0 || query_count == 0 || query_bytes.len() != expected_bytes {
        return Err("query vector file has wrong dimension or count".into());
    }
    let queries = query_bytes
        .chunks_exact(stride)
        .map(|bytes| decode_vector(bytes, dimension))
        .collect::<Result<Vec<_>, _>>()?;
    let mut per_scope = Vec::new();
    let mut all_correct = true;
    let mut peak_rss_kb = 0u64;
    for (name, scope) in scopes {
        let eligible_count: i64 = {
            let (s, v) = scope_sql(scope, "v");
            let args: Vec<rusqlite::types::Value> = v.into_iter().map(Into::into).collect();
            db.query_row(
                &format!("SELECT COUNT(*) FROM vectors v WHERE {s}"),
                rusqlite::params_from_iter(args.iter()),
                |r| r.get(0),
            )?
        };
        let mut k_reports = Vec::new();
        for k in K_VALUES {
            let mut selected_ms = Vec::with_capacity(repeats);
            let mut rust_ms = Vec::with_capacity(repeats);
            let mut scalar_ms = Vec::with_capacity(repeats);
            let mut doc_ms = Vec::with_capacity(repeats);
            let mut vec0_doc_ms = Vec::with_capacity(repeats);
            let mut scalar_doc_ms = Vec::with_capacity(repeats);
            let mut vec0_knn_ms = Vec::with_capacity(repeats);
            let mut vec0_repair_ms = Vec::with_capacity(repeats);
            let mut vec0_raw_knn_ms = Vec::with_capacity(repeats);
            let mut vec0_raw_knn_ids: Vec<i64> = Vec::new();
            let mut vec0_pull_rows = 0usize;
            let mut vec0_boundary_captured = false;
            let mut vec0_reference_exact = false;
            let mut vec0_candidate_matches_oracle = true;
            let mut selected_route = String::new();
            let mut vec0_unsupported_reason = Value::Null;
            let mut vec0_exact_selected = false;
            let mut first_ms = None;
            let mut warm_ms = None;
            let mut vec0_measured_mismatch = false;
            let mut correct = true;
            let mut fragment_ids = Vec::new();
            let mut document_ids = Vec::new();
            let mut tie_count = 0usize;
            let vec0_document_supported = engine == "vec0" && eligible_count <= VEC0_MAX_K as i64;
            for sample in 0..repeats {
                let query = &queries[sample % query_count];
                let mut exact_fragments = Vec::new();
                let rust_start = Instant::now();
                let (rust_reference, _) = rust_scan(&db, &query, scope, k, dimension)?;
                let rust_elapsed = rust_start.elapsed().as_secs_f64() * 1000.0;
                rust_ms.push(rust_elapsed);
                if engine == "rust" {
                    exact_fragments = rust_reference.clone();
                    selected_ms.push(rust_elapsed);
                    selected_route = "rust_exact".into();
                    if first_ms.is_none() {
                        first_ms = Some(rust_elapsed)
                    } else if warm_ms.is_none() {
                        warm_ms = Some(rust_elapsed)
                    }
                } else {
                    // Raw vec0 KNN is always measured as a separate
                    // EXPLORATORY metric (pure f32-kernel cost + identity).
                    // It is never the exact selected route.
                    let raw_start = Instant::now();
                    let raw_knn = vec0_knn_raw(&db, &query, scope, k)?;
                    vec0_raw_knn_ms.push(raw_start.elapsed().as_secs_f64() * 1000.0);
                    if sample == 0 {
                        vec0_raw_knn_ids = raw_knn.iter().map(|h| h.id).collect();
                    }

                    // Exploratory vec0 candidate (KNN + reference re-rank of
                    // the pulled band). `reference_exact` is true only when the
                    // whole eligible set was pulled (<= 4096); otherwise it is a
                    // heuristic candidate checked against, but never trusted
                    // over, the oracle.
                    let candidate =
                        vec0_fragment_candidate(&db, &query, scope, k, eligible_count, dimension)?;
                    let candidate_present = candidate.is_some();
                    let mut selected_vec_exact = false;
                    if let Some(c) = candidate {
                        vec0_knn_ms.push(c.knn_ms);
                        vec0_repair_ms.push(c.repair_ms);
                        vec0_pull_rows = c.pull_rows;
                        vec0_boundary_captured = c.boundary_captured;
                        vec0_reference_exact = c.reference_exact;
                        if c.reference_exact {
                            // Provable vec0 route: full eligible pull re-ranked
                            // in the f64 reference metric.
                            exact_fragments = c.hits;
                            selected_ms.push(c.knn_ms + c.repair_ms);
                            selected_route = "vec0_full_pull_exact".into();
                            selected_vec_exact = true;
                            vec0_exact_selected = true;
                            if first_ms.is_none() {
                                first_ms = Some(c.knn_ms + c.repair_ms)
                            } else if warm_ms.is_none() {
                                warm_ms = Some(c.knn_ms + c.repair_ms)
                            }
                        } else if !same_hits(&c.hits, &rust_reference) {
                            // Exploratory candidate disagreed with the oracle;
                            // record honestly without failing correctness (the
                            // exact route below is still checked).
                            vec0_candidate_matches_oracle = false;
                        }
                    }
                    if !selected_vec_exact {
                        // Honest fallback: with no provable reference-exact
                        // vec0 fragment route (eligible > 4096, or k > 4096), the
                        // selected exact route is the full f64 scan. This is
                        // timed and labelled as a fallback; no pure-vec0 gain is
                        // claimed for it.
                        if !candidate_present {
                            vec0_unsupported_reason =
                                json!(format!("k={k} exceeds vec0 KNN pull cap {VEC0_MAX_K}"));
                        } else {
                            vec0_unsupported_reason = json!(format!(
                                "eligible_fragment_count {eligible_count} exceeds vec0 KNN pull cap {VEC0_MAX_K}; vec0 f32-kernel KNN cannot yield a provable f64-reference top-k without a rigorous kernel error bound; selected exact route falls back to the full f64 scan"
                            ));
                        }
                        exact_fragments = rust_reference.clone();
                        selected_ms.push(rust_elapsed);
                        if selected_route.is_empty() {
                            selected_route = "rust_exact_fallback".into();
                        }
                    }
                }
                let scalar_start = Instant::now();
                let (scalar, _) = scalar_scan(&db, &query, scope, k)?;
                scalar_ms.push(scalar_start.elapsed().as_secs_f64() * 1000.0);
                // exact_fragments is always the SELECTED exact route (rust, the
                // provable vec0 full-pull route, or the honest rust fallback).
                // Check it against the scalar oracle.
                if !same_hits(&exact_fragments, &scalar) {
                    correct = false;
                }
                // When the reference-exact vec0 route was selected, it must also
                // reproduce the f64 rust oracle identity+distance. A disagreement
                // here is a real measured mismatch (not an unsupported case).
                if engine == "vec0"
                    && vec0_exact_selected
                    && !same_hits(&exact_fragments, &rust_reference)
                {
                    correct = false;
                    vec0_measured_mismatch = true;
                }
                let exact_documents = if fragment_only {
                    Vec::new()
                } else {
                    let doc_start = Instant::now();
                    let documents = rust_document_scan(&db, &query, scope, k, dimension)?;
                    doc_ms.push(doc_start.elapsed().as_secs_f64() * 1000.0);
                    documents
                };
                if !fragment_only && vec0_document_supported {
                    let t = Instant::now();
                    let docs =
                        vec0_document_topk(&db, &query, scope, k, eligible_count, dimension)?
                            .unwrap_or_default();
                    vec0_doc_ms.push(t.elapsed().as_secs_f64() * 1000.0);
                    if !same_hits(&exact_documents, &docs) {
                        correct = false;
                    }
                }
                if !fragment_only {
                    let scalar_doc_start = Instant::now();
                    let scalar_docs = scalar_document_scan(&db, &query, scope, k)?;
                    scalar_doc_ms.push(scalar_doc_start.elapsed().as_secs_f64() * 1000.0);
                    // exact_documents is always the f64 rust document oracle.
                    if !same_hits(&exact_documents, &scalar_docs) {
                        correct = false;
                    }
                }
                if sample == 0 {
                    fragment_ids = exact_fragments.iter().map(|h| h.id).collect::<Vec<_>>();
                    document_ids = exact_documents
                        .iter()
                        .map(|h| h.document)
                        .collect::<Vec<_>>();
                }
                tie_count += count_boundary_ties(&exact_fragments, TOLERANCE);
                peak_rss_kb = peak_rss_kb.max(peak_rss());
                if sample % 10 == 9 {
                    eprintln!(
                        "{}",
                        json!({"phase":"query","scope":name,"k":k,"samples":sample+1,"total":repeats,"equivalent_so_far":correct})
                    );
                }
            }
            all_correct &= correct;
            let vec0_fragment_status = if engine != "vec0" {
                "not_applicable"
            } else if vec0_measured_mismatch {
                "exact_route_measured_mismatch"
            } else if vec0_exact_selected {
                "exact_measured"
            } else {
                "unsupported"
            };
            k_reports.push(json!({
                "k": k,
                "eligible_fragment_count": eligible_count,
                "fragment_top_k": {
                    "selected_route": selected_route,
                    "materialized_engine": engine,
                    "selected_p50_ms": percentile(&selected_ms, 0.50),
                    "selected_p95_ms": percentile(&selected_ms, 0.95),
                    "selected_samples": selected_ms.len(),
                    "rust_exact_p50_ms": percentile(&rust_ms, 0.50),
                    "rust_exact_p95_ms": percentile(&rust_ms, 0.95),
                    "rust_samples": rust_ms.len(),
                    "sqlite_scalar_p50_ms": percentile(&scalar_ms, 0.50),
                    "sqlite_scalar_p95_ms": percentile(&scalar_ms, 0.95),
                    "sqlite_scalar_samples": scalar_ms.len(),
                    "vec0_fragment_status": vec0_fragment_status,
                    "vec0_exact_route_selected": vec0_exact_selected,
                    "vec0_unsupported_reason": if engine == "vec0" { vec0_unsupported_reason.clone() } else { Value::Null },
                    "vec0_p50_ms": if engine == "vec0" && vec0_exact_selected { json!(percentile(&selected_ms, 0.50)) } else { Value::Null },
                    "vec0_p95_ms": if engine == "vec0" && vec0_exact_selected { json!(percentile(&selected_ms, 0.95)) } else { Value::Null },
                    "vec0_raw_knn_exploratory_p50_ms": if engine == "vec0" { json!(percentile(&vec0_raw_knn_ms, 0.50)) } else { Value::Null },
                    "vec0_raw_knn_exploratory_p95_ms": if engine == "vec0" { json!(percentile(&vec0_raw_knn_ms, 0.95)) } else { Value::Null },
                    "vec0_raw_knn_exploratory_note": "raw f32-kernel KNN(k); identity+distance are the vec0 kernel metric, NOT the f64 reference oracle; exploratory diagnostic only, never an exactness claim",
                    "vec0_raw_knn_sample_ids": if engine == "vec0" { json!(vec0_raw_knn_ids) } else { Value::Null },
                    "vec0_candidate_knn_p50_ms": if engine == "vec0" { json!(percentile(&vec0_knn_ms, 0.50)) } else { Value::Null },
                    "vec0_candidate_repair_p50_ms": if engine == "vec0" { json!(percentile(&vec0_repair_ms, 0.50)) } else { Value::Null },
                    "vec0_candidate_pull_rows": if engine == "vec0" { json!(vec0_pull_rows) } else { Value::Null },
                    "vec0_candidate_boundary_captured": if engine == "vec0" { json!(vec0_boundary_captured) } else { Value::Null },
                    "vec0_candidate_reference_exact": if engine == "vec0" { json!(vec0_reference_exact) } else { Value::Null },
                    "vec0_candidate_matches_oracle": if engine == "vec0" { json!(vec0_candidate_matches_oracle) } else { Value::Null },
                    "vec0_candidate_note": "KNN + reference-metric rerank of the pulled band; reference_exact only when the entire eligible set (<=4096) was pulled, otherwise a heuristic candidate reported for cost/observability and never treated as the exact top-k",
                    "vec0_scope_filter": "rowid IN (SELECT id FROM full relational scope); included in vec0 query latency",
                    "first_query_ms": first_ms,
                    "warm_query_ms": warm_ms,
                    "sample_query_fragment_ids": fragment_ids
                },
                "document_top_k": {
                    "status": if fragment_only { "not_measured" } else { "measured" },
                    "rust_full_eligible_best_fragment_then_document_rank_p50_ms": if fragment_only { Value::Null } else { json!(percentile(&doc_ms, 0.50)) },
                    "rust_p95_ms": if fragment_only { Value::Null } else { json!(percentile(&doc_ms, 0.95)) },
                    "sqlite_scalar_p50_ms": if fragment_only { Value::Null } else { json!(percentile(&scalar_doc_ms, 0.50)) },
                    "sqlite_scalar_p95_ms": if fragment_only { Value::Null } else { json!(percentile(&scalar_doc_ms, 0.95)) },
                    "vec0_supported": if fragment_only { Value::Null } else { json!(vec0_document_supported) },
                    "vec0_exact_full_aggregation": if fragment_only { Value::Null } else { json!(vec0_document_supported) },
                    "vec0_p50_ms": if vec0_document_supported && !fragment_only { json!(percentile(&vec0_doc_ms, 0.50)) } else { Value::Null },
                    "vec0_p95_ms": if vec0_document_supported && !fragment_only { json!(percentile(&vec0_doc_ms, 0.95)) } else { Value::Null },
                    "vec0_unsupported_reason": if fragment_only { json!("not measured by fragment-only scenario") } else if vec0_document_supported { Value::Null } else { json!("eligible_fragment_count_exceeds_vec0_k_max_4096") },
                    "samples": doc_ms.len(),
                    "sample_query_document_ids": document_ids,
                    "scope_applied_before_best_fragment": !fragment_only
                },
                "fragment_and_document_oracles_match": correct,
                "boundary_ties_within_tolerance": tie_count,
                "topk_tie_identity_stable": correct
            }));
        }
        per_scope.push(json!({"name":name,"eligible_rows":eligible_count,"k_results":k_reports}));
    }
    let correctness = json!({"all_equivalent_paths_match":all_correct,"distance_tolerance":TOLERANCE,"stable_order":"distance then rowid; differing top-k identities fail correctness, including ties","peak_rss_kb":peak_rss_kb,"top_k":[25,100]});
    Ok((Value::Array(per_scope), correctness))
}
fn count_boundary_ties(hits: &[Hit], tolerance: f32) -> usize {
    hits.windows(2)
        .filter(|pair| (pair[0].distance - pair[1].distance).abs() <= tolerance)
        .count()
}
fn same_hits(a: &[Hit], b: &[Hit]) -> bool {
    a.len() == b.len()
        && a.iter().zip(b).all(|(x, y)| {
            x.id == y.id
                && ((x.distance - y.distance).abs() <= TOLERANCE
                    || x.distance.total_cmp(&y.distance).is_eq())
        })
}
fn percentile(values: &[f64], p: f64) -> Option<f64> {
    if values.is_empty() {
        return None;
    }
    let mut x = values.to_vec();
    x.sort_by(f64::total_cmp);
    Some(x[((x.len() - 1) as f64 * p).ceil() as usize])
}
fn peak_rss() -> u64 {
    fs::read_to_string("/proc/self/status")
        .ok()
        .and_then(|s| {
            s.lines()
                .find(|l| l.starts_with("VmHWM:"))
                .and_then(|l| l.split_whitespace().nth(1)?.parse().ok())
        })
        .unwrap_or(0)
}
fn file_size(path: &Path) -> std::io::Result<u64> {
    Ok(fs::metadata(path).map(|m| m.len()).unwrap_or(0))
}
fn sidecar_size(path: &Path, suffix: &str) -> u64 {
    let mut p = path.as_os_str().to_os_string();
    p.push(suffix);
    fs::metadata(PathBuf::from(p)).map(|m| m.len()).unwrap_or(0)
}
fn db_versions(path: &Path) -> Result<(String, String), Box<dyn Error>> {
    let db = open(path)?;
    let sqlite = db.query_row("SELECT sqlite_version()", [], |r| r.get(0))?;
    let vec = db.query_row("SELECT vec_version()", [], |r| r.get(0))?;
    Ok((sqlite, vec))
}

fn seed_source(db: &mut Connection, source: i64, metadata: &str) -> rusqlite::Result<()> {
    db.execute(
        "INSERT INTO source_metadata VALUES(?1,?2)",
        params![source, metadata],
    )?;
    db.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,section,vector) VALUES(?1,?1,?1,1,0,0,?2)",params![source,encode_vector(&[1.0f32,0.0])])?;
    Ok(())
}
fn replace_source(
    db: &mut Connection,
    source: i64,
    candidates: &[Candidate],
    fail_after: Option<usize>,
) -> rusqlite::Result<()> {
    let tx = db.transaction()?;
    tx.execute("DELETE FROM vectors WHERE source_id=?", [source])?;
    for (i, c) in candidates.iter().enumerate() {
        if fail_after == Some(i) {
            return Err(rusqlite::Error::InvalidQuery);
        }
        tx.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,section,vector) VALUES(?1,?2,?3,?4,?5,?6,?7)",params![c.id,c.document,c.source,c.library,c.kind,c.section,encode_vector(&c.vector)])?;
    }
    tx.commit()
}
fn delete_source(db: &Connection, source: i64) -> rusqlite::Result<()> {
    db.execute("DELETE FROM vectors WHERE source_id=?", [source])?;
    db.execute("DELETE FROM source_metadata WHERE source_id=?", [source])?;
    Ok(())
}
fn source_vector_count(db: &Connection, source: i64) -> rusqlite::Result<i64> {
    db.query_row(
        "SELECT COUNT(*) FROM vectors WHERE source_id=?",
        [source],
        |r| r.get(0),
    )
}
fn stage_build(db: &mut Connection, id: &str, candidates: &[Candidate]) -> rusqlite::Result<()> {
    for c in candidates {
        let tx = db.transaction()?;
        tx.execute(
            "INSERT INTO staged_vectors VALUES(?1,?2,?3)",
            params![id, c.id, encode_vector(&c.vector)],
        )?;
        tx.commit()?;
    }
    Ok(())
}
fn publish_build(db: &mut Connection, id: &str) -> rusqlite::Result<()> {
    let tx = db.transaction()?;
    tx.execute("DELETE FROM active_build", [])?;
    tx.execute("INSERT INTO active_build VALUES(?)", [id])?;
    tx.commit()
}
fn active_build(db: &Connection) -> rusqlite::Result<String> {
    db.query_row("SELECT id FROM active_build", [], |r| r.get(0))
}
fn published_count(db: &Connection, id: &str) -> rusqlite::Result<i64> {
    db.query_row(
        "SELECT COUNT(*) FROM staged_vectors WHERE build_id=?",
        [id],
        |r| r.get(0),
    )
}
fn test_db() -> Connection {
    let db = open_memory();
    create_relational_schema(&db).unwrap();
    db
}
fn reopen_test_db() -> Result<Connection, Box<dyn Error>> {
    let path = std::env::temp_dir().join(format!(
        "issue89-reopen-{}.sqlite",
        SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos()
    ));
    {
        let db = open(&path)?;
        let _: String = db.query_row("SELECT vec_version()", [], |r| r.get(0))?;
    }
    let reopened = open(&path)?;
    let _ = fs::remove_file(path);
    Ok(reopened)
}
fn process_crash_rollback_probe() -> Result<bool, Box<dyn Error>> {
    let path = std::env::temp_dir().join(format!(
        "issue89-crash-{}.sqlite",
        SystemTime::now().duration_since(UNIX_EPOCH)?.as_nanos()
    ));
    let status = spawn_crash_probe(&path)?;
    let db = open(&path)?;
    let count: i64 = db.query_row("SELECT COUNT(*) FROM vectors_vec", [], |r| r.get(0))?;
    let _ = fs::remove_file(&path);
    Ok(status.code() == Some(23) && count == 0)
}
fn crash_probe(path: &Path) -> Result<(), Box<dyn Error>> {
    let mut db = open(path)?;
    create_vec_schema(&db, 2)?;
    let tx = db.transaction()?;
    tx.execute("INSERT INTO vectors_vec(rowid,embedding,library_id,kind,item_type,section,document_id) VALUES(1,?,1,0,0,0,1)",[encode_vector(&[1.0f32,0.0])])?;
    std::process::exit(23)
}

fn crash_rollback_check(path: &Path) -> Result<bool, Box<dyn Error>> {
    process_crash_rollback_probe_at(path)
}
fn process_crash_rollback_probe_at(path: &Path) -> Result<bool, Box<dyn Error>> {
    let status = spawn_crash_probe(path)?;
    let db = open(path)?;
    let count: i64 = db.query_row("SELECT COUNT(*) FROM vectors_vec", [], |r| r.get(0))?;
    Ok(status.code() == Some(23) && count == 0)
}
fn spawn_crash_probe(path: &Path) -> Result<std::process::ExitStatus, Box<dyn Error>> {
    let mut command = std::process::Command::new(env::current_exe()?);
    #[cfg(test)]
    command
        .args(["crash_child_helper", "--nocapture"])
        .env("ISSUE89_CRASH_DB", path);
    #[cfg(not(test))]
    command.args(["--crash-probe", path.to_str().ok_or("non-UTF8 crash path")?]);
    Ok(command
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .status()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn explicit_empty_item_refs_is_empty_while_omission_is_unrestricted() {
        let mut db = test_db();
        seed_source(&mut db, 1, "fixture").unwrap();
        let empty = Scope {
            item_refs: Some(vec![]),
            ..Scope::default()
        };
        assert!(
            rust_scan(&db, &[1.0, 0.0], &empty, 25, 2)
                .unwrap()
                .0
                .is_empty()
        );
        assert_eq!(
            rust_scan(&db, &[1.0, 0.0], &Scope::default(), 25, 2)
                .unwrap()
                .0
                .len(),
            1
        );
        assert!(
            scalar_scan(&db, &[1.0, 0.0], &empty, 25)
                .unwrap()
                .0
                .is_empty()
        );
    }
    #[test]
    fn crash_child_helper() {
        if let Some(path) = env::var_os("ISSUE89_CRASH_DB") {
            let _ = crash_probe(Path::new(&path));
        }
    }
    #[test]
    fn cosine_geometry_and_stable_ties() {
        let q = [1.0, 0.0];
        assert_eq!(cosine_distance(&q, &[1.0, 0.0]).unwrap(), 0.0);
        assert_eq!(cosine_distance(&q, &[0.0, 1.0]).unwrap(), 1.0);
        let hits = rank(
            vec![
                Hit {
                    id: 9,
                    document: 9,
                    distance: 0.5,
                },
                Hit {
                    id: 2,
                    document: 2,
                    distance: 0.5,
                },
                Hit {
                    id: 1,
                    document: 1,
                    distance: 0.2,
                },
            ],
            3,
        );
        assert_eq!(hits.iter().map(|h| h.id).collect::<Vec<_>>(), [1, 2, 9]);
    }
    #[test]
    fn cosine_rejects_shape_zero_and_nonfinite() {
        assert!(cosine_distance(&[1.0], &[1.0, 2.0]).is_err());
        assert!(cosine_distance(&[0.0, 0.0], &[1.0, 0.0]).is_err());
        assert!(cosine_distance(&[f32::NAN], &[1.0]).is_err());
        assert!(cosine_distance(&[f32::INFINITY], &[1.0]).is_err());
        assert_eq!(cosine_distance(&[1.0e-20, 0.0], &[1.0, 0.0]).unwrap(), 0.0);
    }
    #[test]
    fn strict_scope_intersection_and_empty_scope() {
        let rows = vec![
            RowMeta {
                id: 1,
                base_index: 0,
                document: 1,
                source: 1,
                library: 1,
                kind: 0,
                item_type: 4,
                section: 0,
                tags: vec![4, 7],
                collections: vec![3],
                item_refs: vec![1],
            },
            RowMeta {
                id: 2,
                base_index: 1,
                document: 2,
                source: 2,
                library: 1,
                kind: 1,
                item_type: 5,
                section: 2,
                tags: vec![7],
                collections: vec![3],
                item_refs: vec![2],
            },
            RowMeta {
                id: 3,
                base_index: 2,
                document: 3,
                source: 3,
                library: 2,
                kind: 1,
                item_type: 5,
                section: 2,
                tags: vec![7],
                collections: vec![3],
                item_refs: vec![3],
            },
        ];
        let scope = Scope {
            library: Some(1),
            item_type: Some(4),
            item_refs: Some(vec![1]),
            tags: vec![7],
            collections: vec![3],
            kind: Some(0),
            section: Some(0),
        };
        assert_eq!(eligible_ids(&rows, &scope), [1]);
        assert!(
            eligible_ids(
                &rows,
                &Scope {
                    library: Some(99),
                    ..Scope::default()
                }
            )
            .is_empty()
        );
        assert!(
            eligible_ids(
                &rows,
                &Scope {
                    item_refs: Some(vec![]),
                    ..Scope::default()
                }
            )
            .is_empty()
        );
    }
    #[test]
    fn document_grouping_ranks_by_best_fragment() {
        let docs = aggregate_documents(
            vec![
                Hit {
                    id: 10,
                    document: 4,
                    distance: 0.08,
                },
                Hit {
                    id: 11,
                    document: 4,
                    distance: 0.01,
                },
                Hit {
                    id: 12,
                    document: 8,
                    distance: 0.04,
                },
            ],
            2,
        );
        assert_eq!(docs.iter().map(|h| h.document).collect::<Vec<_>>(), [4, 8]);
        assert!((docs[0].distance - 0.01).abs() < f32::EPSILON);
    }
    #[test]
    fn source_replace_rollback_commit_and_long_metadata_delete() {
        let mut db = test_db();
        seed_source(&mut db, 10, &"x".repeat(200_000)).unwrap();
        assert!(
            replace_source(
                &mut db,
                10,
                &[Candidate {
                    id: 3,
                    document: 3,
                    source: 10,
                    library: 1,
                    kind: 0,
                    section: 0,
                    tags: vec![],
                    collections: vec![],
                    item_refs: vec![],
                    vector: vec![1.0, 0.0],
                    metadata: String::new()
                }],
                Some(0)
            )
            .is_err()
        );
        assert_eq!(source_vector_count(&db, 10).unwrap(), 1);
        replace_source(
            &mut db,
            10,
            &[Candidate {
                id: 4,
                document: 4,
                source: 10,
                library: 1,
                kind: 0,
                section: 0,
                tags: vec![],
                collections: vec![],
                item_refs: vec![],
                vector: vec![1.0, 0.0],
                metadata: String::new(),
            }],
            None,
        )
        .unwrap();
        assert_eq!(source_vector_count(&db, 10).unwrap(), 1);
        delete_source(&db, 10).unwrap();
        assert_eq!(source_vector_count(&db, 10).unwrap(), 0);
    }
    #[test]
    fn staging_is_hidden_until_short_publish() {
        let mut db = test_db();
        let c = Candidate {
            id: 2,
            document: 2,
            source: 10,
            library: 1,
            kind: 0,
            section: 0,
            tags: vec![],
            collections: vec![],
            item_refs: vec![],
            vector: vec![1.0, 0.0],
            metadata: String::new(),
        };
        stage_build(&mut db, "next", &[c]).unwrap();
        assert_eq!(active_build(&db).unwrap(), "initial");
        publish_build(&mut db, "next").unwrap();
        assert_eq!(active_build(&db).unwrap(), "next");
        assert_eq!(published_count(&db, "next").unwrap(), 1);
    }
    #[test]
    fn sqlite_vec_registers_for_new_connections() {
        let db = test_db();
        let version: String = db
            .query_row("SELECT vec_version()", [], |r| r.get(0))
            .unwrap();
        assert_eq!(version, "v0.1.9");
        let reopened = reopen_test_db().unwrap();
        let _: String = reopened
            .query_row("SELECT vec_version()", [], |r| r.get(0))
            .unwrap();
    }
    #[test]
    fn vec0_shadow_rows_commit_rollback_delete_and_reopen() {
        let path = std::env::temp_dir().join(format!(
            "issue89-vec-tx-{}.sqlite",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        {
            let mut db = open(&path).unwrap();
            create_vec_schema(&db, 2).unwrap();
            {
                let tx = db.transaction().unwrap();
                tx.execute("INSERT INTO vectors_vec(rowid,embedding,library_id,kind,item_type,section,document_id) VALUES(1,?,1,0,0,0,1)",[encode_vector(&[1.0f32,0.0])]).unwrap();
            }
            assert_eq!(
                db.query_row("SELECT COUNT(*) FROM vectors_vec", [], |r| r
                    .get::<_, i64>(0))
                    .unwrap(),
                0
            );
            {
                let tx = db.transaction().unwrap();
                tx.execute("INSERT INTO vectors_vec(rowid,embedding,library_id,kind,item_type,section,document_id) VALUES(2,?,1,0,0,0,2)",[encode_vector(&[0.0f32,1.0])]).unwrap();
                tx.commit().unwrap();
            }
            assert_eq!(
                db.query_row("SELECT COUNT(*) FROM vectors_vec", [], |r| r
                    .get::<_, i64>(0))
                    .unwrap(),
                1
            );
            db.execute("DELETE FROM vectors_vec WHERE rowid=2", [])
                .unwrap();
            assert_eq!(
                db.query_row("SELECT COUNT(*) FROM vectors_vec", [], |r| r
                    .get::<_, i64>(0))
                    .unwrap(),
                0
            );
            let tx = db.transaction().unwrap();
            tx.execute("INSERT INTO vectors_vec(rowid,embedding,library_id,kind,item_type,section,document_id) VALUES(3,?,1,0,0,0,3)",[encode_vector(&[1.0f32,0.0])]).unwrap();
            tx.commit().unwrap();
        }
        {
            let db = open(&path).unwrap();
            assert_eq!(
                db.query_row("SELECT COUNT(*) FROM vectors_vec", [], |r| r
                    .get::<_, i64>(0))
                    .unwrap(),
                1
            );
            db.execute("DELETE FROM vectors_vec WHERE rowid=3", [])
                .unwrap();
        }
        let _ = fs::remove_file(path);
    }
    #[test]
    fn vec0_long_auxiliary_metadata_delete() {
        let db = open_memory();
        db.execute_batch(
            "CREATE VIRTUAL TABLE long_meta USING vec0(embedding float[2], +metadata TEXT);",
        )
        .unwrap();
        let long = "z".repeat(180_000);
        db.execute(
            "INSERT INTO long_meta(rowid,embedding,metadata) VALUES(1,?,?)",
            params![encode_vector(&[1.0f32, 0.0]), long],
        )
        .unwrap();
        assert_eq!(
            db.execute("DELETE FROM long_meta WHERE rowid=1", [])
                .unwrap(),
            1
        );
        assert_eq!(
            db.query_row("SELECT COUNT(*) FROM long_meta", [], |r| r.get::<_, i64>(0))
                .unwrap(),
            0
        );
    }
    #[test]
    fn relational_scope_sql_preserves_multivalued_filter_semantics() {
        let db = test_db();
        for (id, library, vector) in [
            (1, 1, &[1.0f32, 0.0][..]),
            (2, 1, &[0.0f32, 1.0][..]),
            (3, 2, &[1.0f32, 0.0][..]),
        ] {
            db.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,item_type,section,vector) VALUES(?1,?1,?1,?2,1,4,0,?3)",params![id,library,encode_vector(vector)]).unwrap();
        }
        for (row, values) in [(1, vec![10, 11]), (2, vec![11]), (3, vec![10])] {
            for value in values {
                db.execute("INSERT INTO row_tags VALUES(?1,?2)", params![row, value])
                    .unwrap();
            }
        }
        for row in [1, 2] {
            db.execute("INSERT INTO row_collections VALUES(?1,7)", [row])
                .unwrap();
            db.execute("INSERT INTO row_items VALUES(?1,99)", [row])
                .unwrap();
        }
        let scope = Scope {
            library: Some(1),
            item_type: Some(4),
            item_refs: Some(vec![99]),
            tags: vec![10, 11],
            collections: vec![7],
            kind: Some(1),
            section: Some(0),
        };
        let (or_hits, count) = rust_scan(&db, &[1.0, 0.0], &scope, 25, 2).unwrap();
        assert_eq!(count, 2);
        assert_eq!(or_hits.iter().map(|h| h.id).collect::<Vec<_>>(), [1, 2]);
        let scalar = scalar_scan(&db, &[1.0, 0.0], &scope, 25).unwrap();
        assert!(same_hits(&or_hits, &scalar.0));
        let selective = Scope {
            tags: vec![10],
            ..scope.clone()
        };
        let (one_hit, count) = rust_scan(&db, &[1.0, 0.0], &selective, 25, 2).unwrap();
        assert_eq!(count, 1);
        assert_eq!(one_hit.iter().map(|h| h.id).collect::<Vec<_>>(), [1]);
        let vec0 = open_memory();
        create_vec_schema(&vec0, 2).unwrap();
        for id in 1..=3 {
            let row=db.query_row("SELECT document_id,source_id,library_id,kind,item_type,section,vector FROM vectors WHERE id=?",[id],|r|Ok((r.get::<_,i64>(0)?,r.get::<_,i64>(1)?,r.get::<_,i64>(2)?,r.get::<_,i64>(3)?,r.get::<_,i64>(4)?,r.get::<_,i64>(5)?,r.get::<_,Vec<u8>>(6)?))).unwrap();
            vec0.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,item_type,section,vector) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)",params![id,row.0,row.1,row.2,row.3,row.4,row.5,row.6]).unwrap();
            let tags: Vec<i64> = {
                let mut s = db
                    .prepare("SELECT value FROM row_tags WHERE row_id=? ORDER BY value")
                    .unwrap();
                s.query_map([id], |r| r.get(0))
                    .unwrap()
                    .collect::<rusqlite::Result<_>>()
                    .unwrap()
            };
            for tag in tags {
                vec0.execute("INSERT INTO row_tags VALUES(?1,?2)", params![id, tag])
                    .unwrap();
            }
            if id < 3 {
                vec0.execute("INSERT INTO row_collections VALUES(?1,7)", [id])
                    .unwrap();
                vec0.execute("INSERT INTO row_items VALUES(?1,99)", [id])
                    .unwrap();
            }
            vec0.execute("INSERT INTO vectors_vec(rowid,embedding,library_id,kind,item_type,section,document_id) VALUES(?1,?2,?3,?4,?5,?6,?7)",params![id,row.6,row.2,row.3,row.4,row.5,row.0]).unwrap();
        }
        let vec_hits = vec0_knn_raw(&vec0, &[1.0, 0.0], &scope, 25).unwrap();
        assert_eq!(vec_hits.iter().map(|h| h.id).collect::<Vec<_>>(), [1, 2]);
        assert!(same_hits(&or_hits, &vec_hits));
    }
    #[test]
    fn vec0_tied_k_boundary_must_preserve_reference_identity() {
        let db = open_memory();
        create_vec_schema(&db, 2).unwrap();
        for id in 1..=4 {
            db.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,item_type,section,vector) VALUES(?1,?1,?1,1,1,1,0,?2)",params![id,encode_vector(&[1.0f32,0.0])]).unwrap();
            db.execute("INSERT INTO vectors_vec(rowid,embedding,library_id,kind,item_type,section,document_id) VALUES(?1,?,1,1,1,0,?1)",params![id,encode_vector(&[1.0f32,0.0])]).unwrap();
        }
        let scope = Scope {
            library: Some(1),
            ..Scope::default()
        };
        let (reference, _) = rust_scan(&db, &[1.0, 0.0], &scope, 2, 2).unwrap();
        let route = vec0_fragment_candidate(&db, &[1.0, 0.0], &scope, 2, 4, 2)
            .unwrap()
            .unwrap();
        assert!(
            route.reference_exact,
            "eligible=4 <= 4096 must take the provable full-pull exact route"
        );
        let candidate = route.hits;
        assert!(
            same_hits(&reference, &candidate),
            "vec0 tied top-k IDs differ from stable rowid oracle: {candidate:?} vs {reference:?}"
        );
    }
    #[test]
    fn vec0_large_scope_tie_group_captured_but_reported_non_exact() {
        // 4100 eligible rows (> the 4096 vec0 pull cap): 5 rows exactly tied at
        // the best distance 0, the remaining 4095 strictly farther. With k=2 the
        // boundary tie group (5 rows) is fully captured by a small band, so the
        // corrected capture predicate (last pulled distance > k-th distance)
        // must recognise capture immediately and early-stop WITHOUT escalating
        // to the 4096 cap or pulling the full scope. Because eligible > 4096 the
        // candidate is still only a heuristic (reference_exact == false): the
        // selected exact route falls back to the full f64 scan. The captured
        // group here yields the stable rowid oracle [1, 2].
        let db = open_memory();
        create_vec_schema(&db, 2).unwrap();
        let near = [1.0f32, 0.0f32];
        let far = [0.0f32, 1.0f32];
        let mut ins = db.prepare("INSERT INTO vectors(id,document_id,source_id,library_id,kind,item_type,section,vector) VALUES(?1,?1,?1,1,1,1,0,?2)").unwrap();
        let mut insv = db.prepare("INSERT INTO vectors_vec(rowid,embedding,library_id,kind,item_type,section,document_id) VALUES(?1,?,1,1,1,0,?1)").unwrap();
        for id in 1..=4100i64 {
            let v = if id <= 5 { near } else { far };
            ins.execute(params![id, encode_vector(&v)]).unwrap();
            insv.execute(params![id, encode_vector(&v)]).unwrap();
        }
        let scope = Scope {
            library: Some(1),
            ..Scope::default()
        };
        let (reference, _) = rust_scan(&db, &[1.0, 0.0], &scope, 2, 2).unwrap();
        assert_eq!(reference.iter().map(|h| h.id).collect::<Vec<_>>(), [1, 2]);
        let route = vec0_fragment_candidate(&db, &[1.0, 0.0], &scope, 2, 4100, 2)
            .unwrap()
            .unwrap();
        assert!(
            route.boundary_captured,
            "the 5-row boundary tie group must be recognised as captured"
        );
        assert!(
            !route.reference_exact,
            "eligible>4096 must NOT claim a reference-exact vec0 fragment route"
        );
        assert!(
            route.pull_rows <= 66,
            "captured boundary group must early-stop without escalating to the full scope (pulled {})",
            route.pull_rows
        );
        assert!(
            same_hits(&reference, &route.hits),
            "captured-band candidate IDs differ from stable rowid oracle: {:?} vs {:?}",
            route.hits,
            reference
        );
    }
    #[test]
    fn process_exit_releases_uncommitted_transaction() {
        assert!(process_crash_rollback_probe().unwrap());
    }
}
