//! Isolated mmap probe; reuse the exact scanner without a new scoring kernel.
#[allow(dead_code)]
mod reference {
    include!("benchmark.rs");

    fn read_connection(path: &Path, mmap: bool) -> Result<Connection, Box<dyn Error>> {
        let db = Connection::open_with_flags(path, rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)?;
        db.execute_batch("PRAGMA query_only=ON;")?;
        db.pragma_update(None, "mmap_size", if mmap { i64::MAX } else { 0 })?;
        let actual: i64 = db.query_row("PRAGMA mmap_size", [], |r| r.get(0))?;
        if (mmap && actual <= 0) || (!mmap && actual != 0) {
            return Err("mmap_setting_not_effective".into());
        }
        db.execute_batch("BEGIN;")?;
        Ok(db)
    }

    fn exact_equal(a: &[Hit], b: &[Hit]) -> bool {
        a.len() == b.len()
            && a.iter().zip(b).all(|(a, b)| {
                a.id == b.id
                    && a.document == b.document
                    && a.distance.to_bits() == b.distance.to_bits()
            })
    }

    fn observation(path: &Path) -> Result<Value, Box<dyn Error>> {
        let mut map = serde_json::Map::new();
        for line in fs::read_to_string("/proc/self/io")?.lines() {
            if let Some((key, value)) = line.split_once(':') {
                map.insert(key.into(), json!(value.trim().parse::<u64>()?));
            }
        }
        let stat = fs::read_to_string("/proc/self/stat")?;
        let fields: Vec<_> = stat
            .rsplit_once(')')
            .ok_or("invalid_proc_stat")?
            .1
            .split_whitespace()
            .collect();
        map.insert("minor_faults".into(), json!(fields[7].parse::<u64>()?));
        map.insert("major_faults".into(), json!(fields[9].parse::<u64>()?));
        for line in fs::read_to_string("/proc/self/status")?.lines() {
            if let Some((key, value)) = line.split_once(':') {
                if ["VmRSS", "VmHWM", "VmSize", "RssAnon", "RssFile"].contains(&key) {
                    map.insert(
                        format!("{key}_kib"),
                        json!(
                            value
                                .split_whitespace()
                                .next()
                                .ok_or("invalid_proc_status")?
                                .parse::<u64>()?
                        ),
                    );
                }
            }
        }
        let mut mapped_bytes = 0u64;
        for line in fs::read_to_string("/proc/self/maps")?.lines() {
            let fields: Vec<_> = line.split_whitespace().collect();
            if fields.last().copied() == path.to_str() {
                let (start, end) = fields[0].split_once('-').ok_or("invalid_proc_maps")?;
                mapped_bytes += u64::from_str_radix(end, 16)? - u64::from_str_radix(start, 16)?;
            }
        }
        map.insert("database_mapped_virtual_bytes".into(), json!(mapped_bytes));
        let mut database_memory = serde_json::Map::new();
        let mut in_database = false;
        for line in fs::read_to_string("/proc/self/smaps")?.lines() {
            let fields: Vec<_> = line.split_whitespace().collect();
            if fields.first().is_some_and(|first| first.contains('-')) {
                in_database = fields.last().copied() == path.to_str();
            } else if in_database {
                if let Some((key, value)) = line.split_once(':') {
                    if ["Size", "Rss", "Pss"].contains(&key) {
                        let value: u64 = value
                            .split_whitespace()
                            .next()
                            .ok_or("invalid_smaps")?
                            .parse()?;
                        let key = format!("{key}_kib");
                        let sum = database_memory
                            .get(&key)
                            .and_then(Value::as_u64)
                            .unwrap_or(0)
                            + value;
                        database_memory.insert(key, json!(sum));
                    }
                }
            }
        }
        map.insert(
            "database_mapping_memory".into(),
            Value::Object(database_memory),
        );
        for line in fs::read_to_string("/proc/self/smaps_rollup")?.lines() {
            if let Some((key, value)) = line.split_once(':') {
                if ["Pss", "Pss_Anon", "Pss_File"].contains(&key) {
                    map.insert(
                        format!("{key}_kib"),
                        json!(
                            value
                                .split_whitespace()
                                .next()
                                .ok_or("invalid_smaps_rollup")?
                                .parse::<u64>()?
                        ),
                    );
                }
            }
        }
        Ok(Value::Object(map))
    }

    fn measure<T>(
        path: &Path,
        route: &str,
        operation: impl FnOnce() -> Result<T, Box<dyn Error>>,
    ) -> Result<(T, Value), Box<dyn Error>> {
        let before = observation(path)?;
        let start = Instant::now();
        let value = operation()?;
        let ms = start.elapsed().as_secs_f64() * 1000.0;
        let after = observation(path)?;
        let mut delta = serde_json::Map::new();
        for key in [
            "read_bytes",
            "rchar",
            "syscr",
            "minor_faults",
            "major_faults",
        ] {
            delta.insert(
                key.into(),
                json!(
                    after[key]
                        .as_u64()
                        .unwrap()
                        .saturating_sub(before[key].as_u64().unwrap())
                ),
            );
        }
        let report = json!({"route":route,"ms":ms,"delta":delta,"after":after});
        eprintln!("{report}");
        Ok((value, report))
    }

    fn read_probe(db: &Connection) -> Result<u64, Box<dyn Error>> {
        let mut statement = db.prepare("SELECT id,document_id,vector FROM vectors")?;
        let mut rows = statement.query([])?;
        let mut count = 0;
        while let Some(row) = rows.next()? {
            let blob = row.get_ref(2)?.as_blob()?;
            std::hint::black_box((
                row.get::<_, i64>(0)?,
                row.get::<_, i64>(1)?,
                blob.len(),
                blob.first(),
                blob.last(),
            ));
            count += 1;
        }
        Ok(count)
    }

    fn parity(
        a: &Connection,
        b: &Connection,
        query: &[f32],
        documents: usize,
    ) -> Result<(u64, u64), Box<dyn Error>> {
        let plan = QueryPlan::new(query, query.len())?;
        let sql = "SELECT id,document_id,vector FROM vectors ORDER BY id";
        let mut statements = [a.prepare(sql)?, b.prepare(sql)?];
        let [sa, sb] = &mut statements;
        let mut ra = sa.query([])?;
        let mut rb = sb.query([])?;
        let mut best = [
            std::collections::BTreeMap::<i64, Hit>::new(),
            std::collections::BTreeMap::<i64, Hit>::new(),
        ];
        let mut count = 0;
        loop {
            let (left, right) = (ra.next()?, rb.next()?);
            match (left, right) {
                (None, None) => break,
                (Some(left), Some(right)) => {
                    let identities = |row: &rusqlite::Row<'_>| -> rusqlite::Result<(i64, i64)> {
                        Ok((row.get(0)?, row.get(1)?))
                    };
                    let (id, document) = identities(left)?;
                    if identities(right)? != (id, document) {
                        return Err("row_identity_mismatch".into());
                    }
                    let blobs = [left.get_ref(2)?.as_blob()?, right.get_ref(2)?.as_blob()?];
                    if blobs[0] != blobs[1] {
                        return Err("vector_bytes_mismatch".into());
                    }
                    let distances = [
                        reference_cosine_blob(&plan, blobs[0], query.len())?,
                        reference_cosine_blob(&plan, blobs[1], query.len())?,
                    ];
                    if distances[0].to_bits() != distances[1].to_bits() {
                        return Err("distance_bits_mismatch".into());
                    }
                    for route in 0..2 {
                        let hit = Hit {
                            id,
                            document,
                            distance: distances[route],
                        };
                        best[route]
                            .entry(document)
                            .and_modify(|current| {
                                if hit < *current {
                                    *current = hit.clone();
                                }
                            })
                            .or_insert(hit);
                    }
                    count += 1;
                }
                _ => return Err("row_count_mismatch".into()),
            }
        }
        let [left, right] = best.map(|best| rank(best.into_values().collect(), documents));
        if !exact_equal(&left, &right) || left.len() != documents {
            return Err("all_document_winners_mismatch".into());
        }
        Ok((count, documents as u64))
    }

    pub fn entry() -> Result<(), Box<dyn Error>> {
        let args: Vec<_> = env::args().collect();
        if args.len() != 7 || !["profile", "memory"].contains(&args[1].as_str()) {
            return Err("<profile|memory> <db> <queries.f32> <fresh-output> <repeats|mmap0or1> <query-count>".into());
        }
        let path = Path::new(&args[2]);
        let output = Path::new(&args[4]);
        if output.exists() {
            return Err("fresh_output_required".into());
        }
        let count: usize = args[6].parse()?;
        if ![2, 12].contains(&count) {
            return Err("expected_two_or_twelve_queries".into());
        }
        let dimension = 1024;
        let bytes = fs::read(&args[3])?;
        if bytes.len() != 12 * dimension * 4 {
            return Err("expected_twelve_frozen_queries".into());
        }
        let queries = bytes
            .chunks_exact(dimension * 4)
            .take(count)
            .map(|b| decode_vector(b, dimension))
            .collect::<Result<Vec<_>, _>>()?;
        let scope = Scope::default();
        if args[1] == "memory" {
            let mmap = match args[5].as_str() {
                "0" => false,
                "1" => true,
                _ => return Err("memory_mode_requires_zero_or_one".into()),
            };
            let start = Instant::now();
            let db = read_connection(path, mmap)?;
            let preparation_ms = start.elapsed().as_secs_f64() * 1000.0;
            let actual: i64 = db.query_row("PRAGMA mmap_size", [], |r| r.get(0))?;
            let before = observation(path)?;
            let mut samples = Vec::new();
            for _ in 0..2 {
                let (_, report) = measure(path, if mmap { "mmap" } else { "default" }, || {
                    rust_document_scan(&db, &queries[0], &scope, 100, dimension)
                })?;
                samples.push(report);
            }
            fs::write(
                output,
                serde_json::to_vec_pretty(
                    &json!({"format":"issue89-round5-memory-v1","mmap_enabled":mmap,"mmap_effective_limit_bytes":actual,"database_bytes":fs::metadata(path)?.len(),"preparation_ms":preparation_ms,"before":before,"samples":samples}),
                )?,
            )?;
            return Ok(());
        }
        let repeats: usize = args[5].parse()?;
        if !((count == 12 && repeats == 24) || (count == 2 && repeats == 4)) {
            return Err("expected_24_small_or_four_large_pairs".into());
        }
        let start = Instant::now();
        let dbs = [read_connection(path, false)?, read_connection(path, true)?];
        let preparation_ms = start.elapsed().as_secs_f64() * 1000.0;
        let shapes = dbs
            .iter()
            .map(|db| {
                db.query_row(
                    "SELECT COUNT(*),COUNT(DISTINCT document_id) FROM vectors",
                    [],
                    |r| Ok((r.get::<_, i64>(0)?, r.get::<_, i64>(1)?)),
                )
            })
            .collect::<rusqlite::Result<Vec<_>>>()?;
        if shapes[0] != shapes[1] {
            return Err("database_shape_mismatch".into());
        }
        let rows = u64::try_from(shapes[0].0)?;
        let documents = usize::try_from(shapes[0].1)?;
        let limits = dbs
            .iter()
            .map(|db| db.query_row("PRAGMA mmap_size", [], |r| r.get::<_, i64>(0)))
            .collect::<rusqlite::Result<Vec<_>>>()?;
        let mut probes = Vec::new();
        for order in [[0, 1], [1, 0]] {
            for route in order {
                let (actual, mut report) = measure(
                    path,
                    if route == 0 {
                        "default_read_probe"
                    } else {
                        "mmap_read_probe"
                    },
                    || read_probe(&dbs[route]),
                )?;
                if actual != rows {
                    return Err("read_probe_count_mismatch".into());
                }
                report["route_index"] = json!(route);
                probes.push(report);
            }
        }
        let ((distance_checks, winner_checks), validation) =
            measure(path, "full_parity_validation", || {
                let mut checked = (0u64, 0u64);
                for query in &queries {
                    let result = parity(&dbs[0], &dbs[1], query, documents)?;
                    checked.0 += result.0;
                    checked.1 += result.1;
                }
                Ok(checked)
            })?;
        for db in &dbs {
            std::hint::black_box(rust_document_scan(db, &queries[0], &scope, 100, dimension)?);
        }
        let mut samples = Vec::new();
        for index in 0..repeats {
            let query_index = index % queries.len();
            let mut order = [0, 1];
            if (index + index / queries.len()) % 2 == 1 {
                order.reverse();
            }
            let mut results: [Vec<Hit>; 2] = [Vec::new(), Vec::new()];
            for (position, route) in order.into_iter().enumerate() {
                let (hits, mut report) =
                    measure(path, if route == 0 { "default" } else { "mmap" }, || {
                        rust_document_scan(
                            &dbs[route],
                            &queries[query_index],
                            &scope,
                            100,
                            dimension,
                        )
                    })?;
                results[route] = hits;
                report["sample_index"] = json!(index);
                report["query_index"] = json!(query_index);
                report["route_position"] = json!(position);
                samples.push(report);
            }
            if !exact_equal(&results[0], &results[1]) {
                return Err("timed_top100_mismatch".into());
            }
        }
        for query in &queries {
            if !exact_equal(
                &rust_document_scan(&dbs[0], query, &scope, 25, dimension)?,
                &rust_document_scan(&dbs[1], query, &scope, 25, dimension)?,
            ) {
                return Err("top25_mismatch".into());
            }
        }
        let compile_options = dbs[0]
            .prepare("PRAGMA compile_options")?
            .query_map([], |r| r.get::<_, String>(0))?
            .collect::<rusqlite::Result<Vec<_>>>()?;
        let result = json!({"format":"issue89-round5-mmap-v1","database_bytes":fs::metadata(path)?.len(),"rows":rows,"documents":documents,"dimension":dimension,"k":100,"queries":count,"pairs":repeats,"mmap_requested_limit_bytes":i64::MAX,"mmap_effective_limit_bytes":limits[1],"default_mmap_limit_bytes":limits[0],"cache_size":dbs[0].query_row("PRAGMA cache_size",[],|r|r.get::<_,i64>(0))?,"page_size":dbs[0].query_row("PRAGMA page_size",[],|r|r.get::<_,i64>(0))?,"sqlite_version":dbs[0].query_row("SELECT sqlite_version()",[],|r|r.get::<_,String>(0))?,"sqlite_mmap_compile_options":compile_options.iter().filter(|s|s.contains("MMAP")).collect::<Vec<_>>(),"preparation_ms":preparation_ms,"read_probes":probes,"validation":validation,"distance_bits_checked":distance_checks,"full_document_winners_checked":winner_checks,"k25_query_pairs_checked":count,"timed_top100_pairs_checked":repeats,"parity_passed":true,"samples":samples});
        fs::write(output, serde_json::to_vec_pretty(&result)?)?;
        Ok(())
    }

    #[cfg(test)]
    mod mmap_tests {
        use super::*;

        #[test]
        fn read_modes_preserve_all_winners_and_reject_writes() {
            let path = env::temp_dir().join(format!(
                "issue89-mmap-test-{}.sqlite",
                SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            {
                let db = open(&path).unwrap();
                create_relational_schema(&db).unwrap();
                for (id, document, vector) in [
                    (90, 1, [1.0, 0.0]),
                    (3, 1, [1.0, 0.0]),
                    (7, 2, [1.0, 0.0]),
                    (8, 3, [0.0, 1.0]),
                ] {
                    db.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,section,vector) VALUES(?1,?2,1,1,1,0,?3)",params![id,document,encode_vector(&vector)]).unwrap();
                }
                db.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
                    .unwrap();
            }
            let default = read_connection(&path, false).unwrap();
            let mapped = read_connection(&path, true).unwrap();
            let size = |db: &Connection| {
                db.query_row("PRAGMA mmap_size", [], |r| r.get::<_, i64>(0))
                    .unwrap()
            };
            assert_eq!(size(&default), 0);
            assert!(size(&mapped) > 0);
            for k in [1, 3, 25, 100] {
                let a = rust_document_scan(&default, &[1.0, 0.0], &Scope::default(), k, 2).unwrap();
                let b = rust_document_scan(&mapped, &[1.0, 0.0], &Scope::default(), k, 2).unwrap();
                assert_eq!(a, b);
                assert_eq!(
                    a.iter().map(|h| h.document).collect::<Vec<_>>(),
                    b.iter().map(|h| h.document).collect::<Vec<_>>()
                );
                assert_eq!(
                    a.iter().map(|h| h.id).collect::<Vec<_>>(),
                    [3, 7, 8].into_iter().take(k).collect::<Vec<_>>()
                );
            }
            for db in [&default, &mapped] {
                assert!(db.execute("DELETE FROM vectors", []).is_err());
            }
            drop(default);
            drop(mapped);
            fs::remove_file(path).unwrap();
        }
    }
}
fn main() {
    if let Err(error) = reference::entry() {
        eprintln!("issue89-round5: {error}");
        std::process::exit(2);
    }
}
