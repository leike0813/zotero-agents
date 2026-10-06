//! Isolated final batch. No production source, schema or lifecycle integration.
#[allow(dead_code)]
mod experiment {
    include!("issue89/benchmark.rs");
    use std::collections::{BTreeMap, BTreeSet};
    use std::io::{BufReader, BufWriter, Write};

    type Filters = BTreeMap<String, Vec<i64>>;
    const BUDGET: usize = 6400;
    const EXACT_MAX: usize = 4096;

    fn read_floats(path: &Path, count: usize) -> Result<Vec<f32>, Box<dyn Error>> {
        if fs::metadata(path)?.len() != (count * 4) as u64 {
            return Err("float_file_shape_mismatch".into());
        }
        let mut reader = BufReader::new(fs::File::open(path)?);
        let mut values = Vec::with_capacity(count);
        let mut bytes = [0u8; 65536];
        while values.len() < count {
            let take = ((count - values.len()) * 4).min(bytes.len());
            reader.read_exact(&mut bytes[..take])?;
            for word in bytes[..take].chunks_exact(4) {
                let value = f32::from_le_bytes(word.try_into()?);
                if !value.is_finite() {
                    return Err("nonfinite_file_value".into());
                }
                values.push(value);
            }
        }
        Ok(values)
    }

    fn read_db(path: &Path) -> Result<Connection, Box<dyn Error>> {
        // Frozen private copies, zero WAL, no source writers during this batch.
        let db = Connection::open_with_flags(
            format!("file:{}?mode=ro&immutable=1", path.display()),
            rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_URI,
        )?;
        db.execute_batch("PRAGMA query_only=ON; PRAGMA cache_size=-16384; BEGIN;")?;
        Ok(db)
    }

    fn rss_peak() -> Result<u64, Box<dyn Error>> {
        let status = fs::read_to_string("/proc/self/status")?;
        Ok(status
            .lines()
            .find(|line| line.starts_with("VmHWM:"))
            .ok_or("missing_vm_hwm")?
            .split_whitespace()
            .nth(1)
            .ok_or("missing_vm_hwm_value")?
            .parse()?)
    }

    fn path(config: &Value, key: &str) -> Result<PathBuf, Box<dyn Error>> {
        Ok(PathBuf::from(
            config[key].as_str().ok_or("missing_config_path")?,
        ))
    }

    fn save(path: &Path, value: &Value) -> Result<(), Box<dyn Error>> {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)?;
        serde_json::to_writer_pretty(&mut file, value)?;
        file.sync_all()?;
        Ok(())
    }

    fn build_matrix(config: &Value, rows: usize, dimension: usize) -> Result<(), Box<dyn Error>> {
        let started = Instant::now();
        let old = config
            .get("old_matrix")
            .map(|_| read_floats(&path(config, "old_matrix")?, rows * dimension))
            .transpose()?;
        let db = read_db(&path(config, "database")?)?;
        let actual: i64 = db.query_row("SELECT count(*) FROM vectors", [], |r| r.get(0))?;
        if actual != rows as i64 {
            return Err("build_row_count_mismatch".into());
        }
        let mut matrix = Vec::with_capacity(rows * dimension);
        let mut statement = db.prepare("SELECT id,vector FROM vectors ORDER BY id")?;
        let mut cursor = statement.query([])?;
        let mut seen = 0;
        while let Some(row) = cursor.next()? {
            seen += 1;
            if row.get::<_, i64>(0)? != seen as i64 {
                return Err("noncontiguous_build_ids".into());
            }
            let vector = decode_vector(row.get_ref(1)?.as_blob()?, dimension)?;
            let norm: f64 = vector
                .iter()
                .map(|v| f64::from(*v).powi(2))
                .sum::<f64>()
                .sqrt();
            matrix.extend(vector.iter().map(|v| (f64::from(*v) / norm) as f32));
        }
        if seen != rows || matrix.iter().any(|v| !v.is_finite()) {
            return Err("invalid_built_matrix".into());
        }
        let constructed_ms = started.elapsed().as_secs_f64() * 1000.0;
        if let Some(old) = &old {
            if old
                .iter()
                .zip(&matrix)
                .any(|(a, b)| a.to_bits() != b.to_bits())
            {
                return Err("replacement_matrix_differs".into());
            }
        }
        let target = path(config, "matrix")?;
        let mut writer = BufWriter::new(
            fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&target)?,
        );
        for value in &matrix {
            writer.write_all(&value.to_le_bytes())?;
        }
        writer.flush()?;
        writer.get_ref().sync_all()?;
        let result = json!({"mode":"build", "rows":rows,"dimension":dimension,
            "matrix_bytes":fs::metadata(&target)?.len(),"constructed_ms":constructed_ms,
            "total_ms":started.elapsed().as_secs_f64()*1000.0,
            "replacement":old.is_some(),"old_matrix_retained":old.is_some(),
            "explicit_vector_payload_bytes":matrix.len()*4+old.as_ref().map_or(0,|m|m.len()*4),
            "peak_rss_kib":rss_peak()?,"sqlite_version":rusqlite::version()});
        save(&path(config, "output")?, &result)?;
        println!("{result}");
        Ok(())
    }

    fn metadata(db: &Connection, rows: usize) -> Result<Vec<[i64; 5]>, Box<dyn Error>> {
        let mut statement = db.prepare(
            "SELECT id,document_id,library_id,kind,item_type,section FROM vectors ORDER BY id",
        )?;
        let mut cursor = statement.query([])?;
        let mut meta = Vec::with_capacity(rows);
        while let Some(row) = cursor.next()? {
            if row.get::<_, i64>(0)? != (meta.len() + 1) as i64 {
                return Err("noncontiguous_metadata_ids".into());
            }
            meta.push([
                row.get(1)?,
                row.get(2)?,
                row.get(3)?,
                row.get(4)?,
                row.get(5)?,
            ]);
        }
        if meta.len() != rows {
            return Err("metadata_count_mismatch".into());
        }
        Ok(meta)
    }

    fn scalar(key: &str) -> Option<(usize, &'static str)> {
        match key {
            "libraries" => Some((1, "library_id")),
            "kinds" => Some((2, "kind")),
            "types" => Some((3, "item_type")),
            "sections" => Some((4, "section")),
            _ => None,
        }
    }

    fn member(key: &str) -> Option<&'static str> {
        match key {
            "tags" => Some("row_tags"),
            "collections" => Some("row_collections"),
            "items" => Some("row_items"),
            _ => None,
        }
    }

    fn fast_eligible(
        db: &Connection,
        meta: &[[i64; 5]],
        filters: &Filters,
    ) -> Result<Vec<usize>, Box<dyn Error>> {
        let mut mask = vec![true; meta.len()];
        for (key, values) in filters {
            if values.is_empty() {
                return Ok(vec![]);
            }
            if let Some((index, _)) = scalar(key) {
                for (flag, row) in mask.iter_mut().zip(meta) {
                    *flag &= values.contains(&row[index]);
                }
            } else if let Some(table) = member(key) {
                let sql = format!(
                    "SELECT row_id FROM {table} WHERE row_id<=? AND value IN ({})",
                    vec!["?"; values.len()].join(",")
                );
                let mut args = vec![meta.len() as i64];
                args.extend(values);
                let mut statement = db.prepare(&sql)?;
                let mut cursor = statement.query(rusqlite::params_from_iter(args))?;
                let mut membership = vec![false; meta.len()];
                while let Some(row) = cursor.next()? {
                    let id = row.get::<_, i64>(0)? as usize;
                    if id == 0 || id > meta.len() {
                        return Err("membership_id_out_of_range".into());
                    }
                    membership[id - 1] = true;
                }
                for (flag, present) in mask.iter_mut().zip(membership) {
                    *flag &= present;
                }
            } else {
                return Err("unknown_scope_key".into());
            }
        }
        Ok(mask
            .into_iter()
            .enumerate()
            .filter_map(|(id, keep)| keep.then_some(id))
            .collect())
    }

    fn sql_eligible(
        db: &Connection,
        rows: usize,
        filters: &Filters,
        indexed: bool,
    ) -> Result<Vec<usize>, Box<dyn Error>> {
        let mut clauses = vec!["v.id<=?".to_owned()];
        let mut args = vec![rows as i64];
        for (key, values) in filters {
            if values.is_empty() {
                clauses.push("0".into());
                continue;
            }
            let placeholders = vec!["?"; values.len()].join(",");
            if let Some((_, column)) = scalar(key) {
                clauses.push(format!("v.{column} IN ({placeholders})"));
            } else if let Some(table) = member(key) {
                if indexed {
                    clauses.push(format!("v.id IN (SELECT row_id FROM {table} WHERE row_id<=? AND value IN ({placeholders}))"));
                    args.push(rows as i64);
                } else {
                    clauses.push(format!("EXISTS(SELECT 1 FROM {table} m WHERE m.row_id=v.id AND m.value IN ({placeholders}))"));
                }
            } else {
                return Err("unknown_scope_key".into());
            }
            args.extend(values);
        }
        let sql = format!(
            "SELECT v.id FROM vectors v WHERE {} ORDER BY v.id",
            clauses.join(" AND ")
        );
        let mut statement = db.prepare(&sql)?;
        Ok(statement
            .query_map(rusqlite::params_from_iter(args), |row| {
                Ok(row.get::<_, i64>(0)? as usize - 1)
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?)
    }

    fn filters(db: &Connection, scope: &str) -> Result<Filters, Box<dyn Error>> {
        let anchor: [i64;4]=db.query_row("SELECT v.library_id,v.item_type,t.value,c.value FROM vectors v JOIN row_tags t ON t.row_id=v.id JOIN row_collections c ON c.row_id=v.id WHERE v.kind=1 AND v.id<=12646 ORDER BY v.id,t.value,c.value LIMIT 1",[],|r|Ok([r.get(0)?,r.get(1)?,r.get(2)?,r.get(3)?]))?;
        Ok(match scope {
            "all" => Filters::new(),
            "intersection" => Filters::from([
                ("libraries".into(), vec![anchor[0]]),
                ("types".into(), vec![anchor[1]]),
                ("kinds".into(), vec![1]),
                ("tags".into(), vec![anchor[2]]),
                ("collections".into(), vec![anchor[3]]),
            ]),
            "union_intersection" => Filters::from([
                ("libraries".into(), vec![anchor[0]]),
                ("kinds".into(), vec![1, 2]),
                ("tags".into(), vec![anchor[2], anchor[2] + 1]),
                ("collections".into(), vec![anchor[3], anchor[3] + 1]),
            ]),
            "topic_section" => {
                let section = db.query_row(
                    "SELECT section FROM vectors WHERE kind=3 AND id<=12646 ORDER BY id LIMIT 1",
                    [],
                    |r| r.get::<_, i64>(0),
                )?;
                Filters::from([
                    ("kinds".into(), vec![3]),
                    ("sections".into(), vec![section]),
                ])
            }
            _ => return Err("unknown_scope".into()),
        })
    }

    fn rescore(
        db: &Connection,
        query: &[f32],
        candidates: &[usize],
        meta: &[[i64; 5]],
    ) -> Result<Vec<Hit>, Box<dyn Error>> {
        let plan = QueryPlan::new(query, query.len())?;
        let mut ids = candidates.to_vec();
        ids.sort_unstable();
        let mut hits = Vec::with_capacity(ids.len());
        for chunk in ids.chunks(128) {
            let sql = format!(
                "SELECT id,document_id,vector FROM vectors WHERE id IN ({}) ORDER BY id",
                vec!["?"; chunk.len()].join(",")
            );
            let mut statement = db.prepare(&sql)?;
            let mut cursor = statement.query(rusqlite::params_from_iter(
                chunk.iter().map(|id| (*id + 1) as i64),
            ))?;
            let mut seen = 0;
            while let Some(row) = cursor.next()? {
                let id = row.get::<_, i64>(0)? as usize;
                if seen >= chunk.len() || id != chunk[seen] + 1 {
                    return Err("candidate_row_mismatch".into());
                }
                let document = row.get::<_, i64>(1)?;
                if document != meta[id - 1][0] {
                    return Err("candidate_document_mismatch".into());
                }
                hits.push(Hit {
                    id: id as i64,
                    document,
                    distance: reference_cosine_blob(
                        &plan,
                        row.get_ref(2)?.as_blob()?,
                        query.len(),
                    )?,
                });
                seen += 1;
            }
            if seen != chunk.len() {
                return Err("candidate_row_missing".into());
            }
        }
        Ok(hits)
    }

    struct Request {
        pool: Vec<Hit>,
        top: Vec<Hit>,
        allowed: Vec<usize>,
        timing: Value,
    }

    fn execute(
        db: &Connection,
        matrix: &[f32],
        query: &[f32],
        meta: &[[i64; 5]],
        filters: &Filters,
    ) -> Result<Request, Box<dyn Error>> {
        let started = Instant::now();
        let allowed = fast_eligible(db, meta, filters)?;
        let prepared = Instant::now();
        let normalized = normalize(query)?;
        let exact = allowed.len() <= EXACT_MAX;
        let candidates = if exact {
            allowed.clone()
        } else {
            final_candidates(matrix, &normalized, &allowed, BUDGET)?
        };
        if candidates.len() != allowed.len().min(if exact { EXACT_MAX } else { BUDGET })
            || candidates
                .iter()
                .any(|id| allowed.binary_search(id).is_err())
        {
            return Err("candidate_budget_or_scope".into());
        }
        let searched = Instant::now();
        let pool = rescore(db, query, &candidates, meta)?;
        let rescored = Instant::now();
        let top = aggregate_documents(pool.clone(), 100);
        let aggregated = Instant::now();
        drop(candidates);
        drop(normalized);
        let cleaned = Instant::now();
        let ms = |a: Instant, b: Instant| (b - a).as_secs_f64() * 1000.0;
        let timing = json!({"total_ms":ms(started,cleaned),"prepare_ms":ms(started,prepared),"search_ms":ms(prepared,searched),
            "rescore_ms":ms(searched,rescored),"aggregate_ms":ms(rescored,aggregated),"cleanup_ms":ms(aggregated,cleaned),
            "candidate_count":pool.len(),"exact_route":exact});
        Ok(Request {
            pool,
            top,
            allowed,
            timing,
        })
    }

    fn normalize(query: &[f32]) -> Result<Vec<f32>, Box<dyn Error>> {
        validate_vector(query, query.len())?;
        let norm = query
            .iter()
            .map(|v| f64::from(*v).powi(2))
            .sum::<f64>()
            .sqrt();
        Ok(query
            .iter()
            .map(|v| (f64::from(*v) / norm) as f32)
            .collect())
    }

    fn quality(request: &Request, exact: &[Hit], k: usize) -> Value {
        let expected = &exact[..exact.len().min(k)];
        let got = &request.top[..request.top.len().min(k)];
        let docs: BTreeSet<_> = got.iter().map(|hit| hit.document).collect();
        let candidates: BTreeSet<_> = request.pool.iter().map(|hit| hit.id).collect();
        let winners: BTreeSet<_> = got.iter().map(|hit| hit.id).collect();
        let denominator = expected.len() as f64;
        if expected.is_empty() {
            return Value::Null;
        }
        json!({"object_recall":expected.iter().filter(|hit|docs.contains(&hit.document)).count() as f64/denominator,
            "best_fragment_coverage":expected.iter().filter(|hit|candidates.contains(&hit.id)).count() as f64/denominator,
            "winner_identity_recall":expected.iter().filter(|hit|winners.contains(&hit.id)).count() as f64/denominator})
    }

    fn exact_best(allowed: &[usize], distances: &[f32], meta: &[[i64; 5]]) -> Vec<Hit> {
        let mut best = BTreeMap::<i64, Hit>::new();
        for &id in allowed {
            let hit = Hit {
                id: (id + 1) as i64,
                document: meta[id][0],
                distance: distances[id],
            };
            best.entry(hit.document)
                .and_modify(|current| {
                    if hit < *current {
                        *current = hit.clone();
                    }
                })
                .or_insert(hit);
        }
        rank(best.into_values().collect(), 100)
    }

    fn final_same_hits(a: &[Hit], b: &[Hit]) -> bool {
        a.len() == b.len()
            && a.iter().zip(b).all(|(a, b)| {
                a.id == b.id
                    && a.document == b.document
                    && a.distance.to_bits() == b.distance.to_bits()
            })
    }

    fn run(config: &Value, rows: usize, dimension: usize) -> Result<(), Box<dyn Error>> {
        let started = Instant::now();
        let matrix = read_floats(&path(config, "matrix")?, rows * dimension)?;
        let matrix_load_ms = started.elapsed().as_secs_f64() * 1000.0;
        let initialized = Instant::now();
        let db = read_db(&path(config, "database")?)?;
        let meta = metadata(&db, rows)?;
        let metadata_ms = initialized.elapsed().as_secs_f64() * 1000.0;
        let queries = read_floats(&path(config, "queries")?, 44 * dimension)?;
        for query in queries.chunks_exact(dimension) {
            validate_vector(query, dimension)?;
        }
        let scope = config["scope"].as_str().ok_or("missing_scope")?;
        let filters = filters(&db, scope)?;
        let oracle_started = Instant::now();
        let oracle = read_floats(&path(config, "oracle")?, 44 * rows)?;
        let oracle_load_ms = oracle_started.elapsed().as_secs_f64() * 1000.0;
        let first = execute(&db, &matrix, &queries[..dimension], &meta, &filters)?;
        let first_request_ms = first.timing["total_ms"]
            .as_f64()
            .ok_or("missing_first_ms")?;
        let canonical_allowed = first.allowed;
        if sql_eligible(&db, rows, &filters, false)? != canonical_allowed
            || sql_eligible(&db, rows, &filters, true)? != canonical_allowed
        {
            return Err("scope_projection_mismatch".into());
        }
        let warmup = execute(&db, &matrix, &queries[..dimension], &meta, &filters)?;
        let warmup_ms = warmup.timing["total_ms"]
            .as_f64()
            .ok_or("missing_warmup_ms")?;
        drop(warmup);
        let objects = canonical_allowed
            .iter()
            .map(|id| meta[*id][0])
            .collect::<BTreeSet<_>>()
            .len();
        let mut records = vec![];
        let mut previous = Vec::<Vec<Hit>>::new();
        let mut distance_bits_checked = 0;
        for repeat in 0..3 {
            for query_index in 0..44 {
                let request = execute(
                    &db,
                    &matrix,
                    &queries[query_index * dimension..(query_index + 1) * dimension],
                    &meta,
                    &filters,
                )?;
                if request.allowed != canonical_allowed {
                    return Err("scope_changed".into());
                }
                let distances = &oracle[query_index * rows..(query_index + 1) * rows];
                for hit in &request.pool {
                    if hit.distance.to_bits() != distances[hit.id as usize - 1].to_bits() {
                        return Err("candidate_bits_mismatch".into());
                    }
                    distance_bits_checked += 1;
                }
                let expected_candidates = aggregate_documents(
                    request
                        .pool
                        .iter()
                        .map(|hit| Hit {
                            distance: distances[hit.id as usize - 1],
                            ..hit.clone()
                        })
                        .collect(),
                    100,
                );
                if !final_same_hits(&expected_candidates, &request.top) {
                    return Err("candidate_winner_mismatch".into());
                }
                if repeat == 0 {
                    previous.push(request.pool.clone());
                } else if !final_same_hits(&previous[query_index], &request.pool) {
                    return Err("unstable_repeat".into());
                }
                let mut record = request.timing.clone();
                record["repeat"] = json!(repeat);
                record["query_index"] = json!(query_index);
                if repeat == 0 {
                    let exact = exact_best(&canonical_allowed, distances, &meta);
                    record["quality"] = json!({"25":quality(&request,&exact,25),"100":quality(&request,&exact,100)});
                } else {
                    record["quality"] = Value::Null;
                }
                println!(
                    "{}",
                    json!({"scope":scope,"repeat":repeat,"query_index":query_index,"total_ms":record["total_ms"]})
                );
                records.push(record);
            }
        }
        let output = json!({"mode":"run","scope":scope,"rows":rows,"dimension":dimension,"eligible_count":canonical_allowed.len(),
            "object_count":objects,"candidate_budget":BUDGET,"exact_max":EXACT_MAX,"matrix_load_ms":matrix_load_ms,
            "metadata_ms":metadata_ms,"oracle_load_ms":oracle_load_ms,"first_request_ms":first_request_ms,"warmup_ms":warmup_ms,
            "distance_bits_checked":distance_bits_checked,"candidate_bits_mismatches":0,"scope_mismatches":0,"stable_mismatches":0,
            "records":records,"peak_rss_kib":rss_peak()?,"sqlite_version":rusqlite::version(),
            "query_count":44,"quality_source_repeat":0,"oracle_used_by_execute":false});
        save(&path(config, "output")?, &output)?;
        Ok(())
    }

    fn final_candidates(
        matrix: &[f32],
        query: &[f32],
        allowed: &[usize],
        budget: usize,
    ) -> Result<Vec<usize>, Box<dyn Error>> {
        if query.is_empty() || budget == 0 || !matrix.len().is_multiple_of(query.len()) {
            return Err("invalid_candidate_shape".into());
        }
        if allowed
            .last()
            .is_some_and(|id| *id >= matrix.len() / query.len())
            || allowed.windows(2).any(|ids| ids[0] >= ids[1])
        {
            return Err("invalid_candidate_ids".into());
        }
        let mut scores = Vec::with_capacity(allowed.len());
        for &id in allowed {
            let vector = &matrix[id * query.len()..(id + 1) * query.len()];
            let mut lanes = [0.0f32; 8];
            for (a, b) in vector.chunks_exact(8).zip(query.chunks_exact(8)) {
                for lane in 0..8 {
                    lanes[lane] += a[lane] * b[lane];
                }
            }
            let mut score: f32 = lanes.into_iter().sum();
            for offset in query.len() / 8 * 8..query.len() {
                score += vector[offset] * query[offset];
            }
            if !score.is_finite() {
                return Err("nonfinite_candidate_score".into());
            }
            scores.push((score, id));
        }
        let compare = |a: &(f32, usize), b: &(f32, usize)| b.0.total_cmp(&a.0).then(a.1.cmp(&b.1));
        if scores.len() > budget {
            scores.select_nth_unstable_by(budget, compare);
            scores.truncate(budget);
        }
        scores.sort_unstable_by(compare);
        Ok(scores.into_iter().map(|(_, id)| id).collect())
    }

    pub fn self_test() -> Result<(), Box<dyn Error>> {
        let ids = final_candidates(&[1.0, 0.0, 1.0, 0.0], &[1.0, 0.0], &[0, 1], 1)?;
        assert_eq!(
            ids,
            vec![0],
            "equal scores retain the first stable identity"
        );
        let db = Connection::open_in_memory()?;
        create_relational_schema(&db)?;
        for (id, document, library, vector) in [
            (1, 1, 1, vec![1.0, 0.0]),
            (2, 1, 1, vec![0.9, 0.1]),
            (3, 2, 1, vec![0.0, 1.0]),
            (4, 3, 2, vec![1.0, 0.0]),
        ] {
            db.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,item_type,section,vector) VALUES(?1,?2,?1,?3,1,1,0,?4)",params![id,document,library,encode_vector(&vector)])?;
        }
        db.execute_batch("INSERT INTO row_tags VALUES(1,7),(1,8),(2,7),(3,8),(4,7); INSERT INTO row_collections VALUES(1,9),(3,9),(4,9);")?;
        let meta = metadata(&db, 4)?;
        let filters = Filters::from([
            ("libraries".into(), vec![1]),
            ("tags".into(), vec![7, 8]),
            ("collections".into(), vec![9]),
        ]);
        assert_eq!(fast_eligible(&db, &meta, &filters)?, vec![0, 2]);
        assert_eq!(sql_eligible(&db, 4, &filters, false)?, vec![0, 2]);
        assert_eq!(sql_eligible(&db, 4, &filters, true)?, vec![0, 2]);
        let result = execute(&db, &[], &[1.0, 0.0], &meta, &filters)?;
        assert_eq!(
            result.top.iter().map(|hit| hit.id).collect::<Vec<_>>(),
            vec![1, 3]
        );
        assert_eq!(result.top[0].distance.to_bits(), 0.0f32.to_bits());
        let across = Filters::from([("libraries".into(), vec![1, 2])]);
        assert_eq!(fast_eligible(&db, &meta, &across)?.len(), 4);
        let empty = Filters::from([("kinds".into(), vec![])]);
        assert!(
            execute(&db, &[], &[1.0, 0.0], &meta, &empty)?
                .top
                .is_empty()
        );
        assert!(final_candidates(&[1.0, 0.0], &[1.0, 0.0], &[0, 0], 1).is_err());
        assert!(final_candidates(&[1.0, 0.0], &[1.0, 0.0], &[1], 1).is_err());
        assert!(final_candidates(&[f32::NAN, 0.0], &[1.0, 0.0], &[0], 1).is_err());
        assert!(normalize(&[0.0, 0.0]).is_err());
        let pool = rescore(&db, &[1.0, 0.0], &[0, 1], &meta)?;
        let truncated = Request {
            top: aggregate_documents(pool.clone(), 100),
            pool,
            allowed: vec![0, 1, 2],
            timing: Value::Null,
        };
        let exact = exact_best(&[0, 1, 2], &[0.0, 0.1, 1.0, 0.0], &meta);
        assert_eq!(
            quality(&truncated, &exact, 100)["object_recall"],
            json!(0.5)
        );
        let full = execute(
            &db,
            &[],
            &[1.0, 0.0],
            &meta,
            &Filters::from([("libraries".into(), vec![1])]),
        )?;
        assert_eq!(
            quality(&full, &exact, 100)["best_fragment_coverage"],
            json!(1.0)
        );
        println!(
            "{}",
            json!({"self_test":"passed","checks":"tie identity, hard scope, multi-membership, cross-library, empty, invalid input, fragment-budget counterexample"})
        );
        Ok(())
    }

    pub fn final_cli() -> Result<(), Box<dyn Error>> {
        let args: Vec<_> = env::args().collect();
        if args.get(1).is_some_and(|arg| arg == "--self-test") {
            return self_test();
        }
        if args.len() != 2 {
            return Err("expected_config_or_self_test".into());
        }
        let config: Value = serde_json::from_slice(&fs::read(&args[1])?)?;
        let rows = config["rows"].as_u64().ok_or("missing_rows")? as usize;
        let dimension = config["dimension"].as_u64().ok_or("missing_dimension")? as usize;
        if rows == 0 || dimension != 1024 {
            return Err("invalid_batch_shape".into());
        }
        match config["mode"].as_str() {
            Some("build") => build_matrix(&config, rows, dimension),
            Some("run") => run(&config, rows, dimension),
            _ => Err("unknown_mode".into()),
        }
    }
}

fn main() {
    if let Err(error) = experiment::final_cli() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
