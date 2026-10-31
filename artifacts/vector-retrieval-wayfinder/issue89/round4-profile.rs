//! Isolated read/compute and single-variable probes; never a production cache.
#[allow(dead_code)]
mod reference {
    include!("benchmark.rs");
    use std::collections::{BTreeMap, HashMap};

    fn vector_norm(blob: &[u8], dimension: usize) -> Result<f64, Box<dyn Error>> {
        if blob.len() != dimension * 4 {
            return Err("stored vector BLOB has wrong dimension".into());
        }
        let mut norm = 0f64;
        for chunk in blob.chunks_exact(4) {
            let value = f32::from_le_bytes(chunk.try_into().unwrap()) as f64;
            norm += value * value;
        }
        if norm <= 0.0 || !norm.is_finite() {
            return Err("stored vector has zero or non-finite norm".into());
        }
        Ok(norm)
    }

    fn cached_cosine(query: &QueryPlan, blob: &[u8], norm: f64) -> Result<f32, Box<dyn Error>> {
        if blob.len() != query.dimension() * 4 || norm <= 0.0 || !norm.is_finite() {
            return Err("invalid cached vector".into());
        }
        let mut dot = 0f64;
        for (i, chunk) in blob.chunks_exact(4).enumerate() {
            let y = f32::from_le_bytes(chunk.try_into().unwrap()) as f64;
            dot += query.values[i] as f64 * y;
        }
        let denom = query.norm_sq.sqrt() * norm.sqrt();
        if denom == 0.0 || !denom.is_finite() {
            return Err("cosine denominator is zero or non-finite".into());
        }
        let distance = 1.0 - dot / denom;
        if !distance.is_finite() {
            return Err("cosine distance is non-finite".into());
        }
        Ok(distance as f32)
    }

    fn aggregate(hits: Vec<Hit>, hash: bool, k: usize) -> Vec<Hit> {
        let mut tree = BTreeMap::new();
        let mut hashed = HashMap::new();
        for hit in hits {
            let entry = if hash {
                hashed.entry(hit.document).or_insert_with(|| hit.clone())
            } else {
                tree.entry(hit.document).or_insert_with(|| hit.clone())
            };
            if hit < *entry {
                *entry = hit;
            }
        }
        rank(
            if hash {
                hashed.into_values().collect()
            } else {
                tree.into_values().collect()
            },
            k,
        )
    }

    const SQL: &str = "SELECT v.id,v.document_id,v.vector FROM vectors v WHERE 1=1";

    // ponytail: full resident vectors for a bounded 2k experiment; use streaming
    // diagnostics if the resident input exceeds this experiment's memory budget.
    struct Resident {
        vectors: Vec<u8>,
        ids: Vec<(i64, i64)>,
        norms: Vec<f64>,
        dimension: usize,
    }

    fn load(db: &Connection, dimension: usize) -> Result<Resident, Box<dyn Error>> {
        let mut data = Resident {
            vectors: Vec::new(),
            ids: Vec::new(),
            norms: Vec::new(),
            dimension,
        };
        let mut stmt = db.prepare(&format!("{SQL} ORDER BY v.id"))?;
        let mut rows = stmt.query([])?;
        while let Some(row) = rows.next()? {
            let id: i64 = row.get(0)?;
            if id != data.ids.len() as i64 + 1 {
                return Err("experiment_requires_dense_ordered_ids".into());
            }
            let blob = row.get_ref(2)?.as_blob()?;
            if blob.len() != dimension * 4 {
                return Err("wrong_vector_dimension".into());
            }
            data.ids.push((id, row.get(1)?));
            data.vectors.extend_from_slice(blob);
        }
        Ok(data)
    }

    fn scan(
        db: &Connection,
        data: &Resident,
        query: &[f32],
        resident: bool,
        cached: bool,
        hash: bool,
        k: usize,
    ) -> Result<Vec<Hit>, Box<dyn Error>> {
        let plan = QueryPlan::new(query, data.dimension)?;
        let mut tree = BTreeMap::new();
        let mut hashed = HashMap::new();
        let mut visit = |id: i64, document: i64, blob: &[u8]| -> Result<(), Box<dyn Error>> {
            let distance = if cached {
                cached_cosine(&plan, blob, data.norms[(id - 1) as usize])?
            } else {
                reference_cosine_blob(&plan, blob, data.dimension)?
            };
            let hit = Hit {
                id,
                document,
                distance,
            };
            let entry = if hash {
                hashed.entry(document).or_insert_with(|| hit.clone())
            } else {
                tree.entry(document).or_insert_with(|| hit.clone())
            };
            if hit < *entry {
                *entry = hit;
            }
            Ok(())
        };
        if resident {
            for ((id, document), blob) in data
                .ids
                .iter()
                .zip(data.vectors.chunks_exact(data.dimension * 4))
            {
                visit(*id, *document, blob)?;
            }
        } else {
            let mut stmt = db.prepare(SQL)?;
            let mut rows = stmt.query([])?;
            while let Some(row) = rows.next()? {
                visit(row.get(0)?, row.get(1)?, row.get_ref(2)?.as_blob()?)?;
            }
        }
        Ok(rank(
            if hash {
                hashed.into_values().collect()
            } else {
                tree.into_values().collect()
            },
            k,
        ))
    }

    fn exact_equal(a: &[Hit], b: &[Hit]) -> bool {
        a.len() == b.len()
            && a.iter().zip(b).all(|(a, b)| {
                a.id == b.id
                    && a.document == b.document
                    && a.distance.to_bits() == b.distance.to_bits()
            })
    }

    fn io_counters() -> Value {
        let entries = fs::read_to_string("/proc/self/io").unwrap_or_default();
        let mut map = serde_json::Map::new();
        for line in entries.lines() {
            if let Some((key, value)) = line.split_once(':') {
                if let Ok(value) = value.trim().parse::<u64>() {
                    map.insert(key.into(), json!(value));
                }
            }
        }
        Value::Object(map)
    }

    fn measured<T>(
        name: &str,
        operation: impl FnOnce() -> Result<T, Box<dyn Error>>,
    ) -> Result<(T, Value), Box<dyn Error>> {
        let before = io_counters();
        let started = Instant::now();
        let value = operation()?;
        let ms = started.elapsed().as_secs_f64() * 1000.0;
        let after = io_counters();
        let delta = |key: &str| {
            after[key]
                .as_u64()
                .unwrap_or(0)
                .saturating_sub(before[key].as_u64().unwrap_or(0))
        };
        let report = json!({"route":name,"ms":ms,"physical_read_bytes":delta("read_bytes"),"logical_read_bytes":delta("rchar"),"peak_rss_kib":peak_rss()});
        eprintln!("{report}");
        Ok((value, report))
    }

    fn summarize(samples: &[Value]) -> Value {
        let times: Vec<_> = samples.iter().map(|s| s["ms"].as_f64().unwrap()).collect();
        json!({"samples":samples.len(),"p50_ms":percentile(&times,0.5),"p95_ms":percentile(&times,0.95),"min_ms":times.iter().copied().reduce(f64::min),"max_ms":times.iter().copied().reduce(f64::max),"physical_read_bytes":samples.iter().map(|s|s["physical_read_bytes"].as_u64().unwrap()).sum::<u64>(),"sample_data":samples})
    }

    pub fn entry() -> Result<(), Box<dyn Error>> {
        let args: Vec<_> = env::args().collect();
        if args.len() != 5 {
            return Err("<database> <queries.f32> <fresh-output.json> <repeats>".into());
        }
        let output = Path::new(&args[3]);
        if output.exists() {
            return Err("fresh_output_required".into());
        }
        let repeats: usize = args[4].parse()?;
        if !(12..=48).contains(&repeats) {
            return Err("repeats_must_be_12_to_48".into());
        }
        let dimension = 1024;
        let bytes = fs::read(&args[2])?;
        if bytes.len() != 12 * dimension * 4 {
            return Err("expected_twelve_frozen_queries".into());
        }
        let queries = bytes
            .chunks_exact(dimension * 4)
            .map(|b| decode_vector(b, dimension))
            .collect::<Result<Vec<_>, _>>()?;
        let db = Connection::open_with_flags(&args[1], rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)?;
        db.execute_batch("PRAGMA query_only=ON; BEGIN;")?;
        let pragmas = json!({"cache_size":db.query_row("PRAGMA cache_size",[],|r|r.get::<_,i64>(0))?,"mmap_size":db.query_row("PRAGMA mmap_size",[],|r|r.get::<_,i64>(0))?,"page_size":db.query_row("PRAGMA page_size",[],|r|r.get::<_,i64>(0))?});
        let mut reads = Vec::new();
        for _ in 0..6 {
            let (_, report) = measured("sqlite_read_only", || {
                let mut stmt = db.prepare(SQL)?;
                let mut rows = stmt.query([])?;
                let mut count = 0usize;
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
            })?;
            reads.push(report);
        }
        let (mut data, preload) = measured("resident_preload", || load(&db, dimension))?;
        let (_, norm_prepare) = measured("norm_cache_prepare", || {
            data.norms = data
                .vectors
                .chunks_exact(dimension * 4)
                .map(|b| vector_norm(b, dimension))
                .collect::<Result<Vec<_>, _>>()?;
            Ok(())
        })?;
        let documents = data
            .ids
            .iter()
            .map(|(_, d)| *d)
            .collect::<std::collections::BTreeSet<_>>()
            .len();
        let mut distances_checked = 0u64;
        let mut winners = Vec::new();
        let (_, parity) = measured("full_parity_validation", || {
            for query in &queries {
                let plan = QueryPlan::new(query, dimension)?;
                let mut hits = Vec::new();
                for (index, blob) in data.vectors.chunks_exact(dimension * 4).enumerate() {
                    let original = reference_cosine_blob(&plan, blob, dimension)?;
                    let cached = cached_cosine(&plan, blob, data.norms[index])?;
                    if original.to_bits() != cached.to_bits() {
                        return Err("distance_bits_mismatch".into());
                    }
                    distances_checked += 1;
                    hits.push(Hit {
                        id: data.ids[index].0,
                        document: data.ids[index].1,
                        distance: original,
                    });
                }
                let original =
                    rust_document_scan(&db, query, &Scope::default(), documents, dimension)?;
                for hash in [false, true] {
                    let candidate = aggregate(hits.clone(), hash, documents);
                    if !exact_equal(&original, &candidate) {
                        return Err("all_document_winners_mismatch".into());
                    }
                }
                winners.push(original);
            }
            Ok(())
        })?;
        let routes = [
            "sqlite_reference",
            "sqlite_norm_cache",
            "sqlite_hashmap",
            "resident_reference",
            "resident_norm_cache",
            "resident_hashmap",
        ];
        // One untimed run per route; validation already warms the shared input.
        for (route, name) in routes.iter().enumerate() {
            let hits = scan(
                &db,
                &data,
                &queries[0],
                route >= 3,
                route % 3 == 1,
                route % 3 == 2,
                100,
            )?;
            if !exact_equal(&hits, &winners[0][..100.min(documents)]) {
                return Err(format!("warmup_mismatch_{name}").into());
            }
        }
        let mut measurements: Vec<Vec<Value>> = vec![Vec::new(); routes.len()];
        for index in 0..repeats {
            let query_index = index % queries.len();
            let mut order: Vec<_> = (0..routes.len())
                .map(|r| (r + index) % routes.len())
                .collect();
            if (index / routes.len() + index / queries.len()) % 2 == 1 {
                order.reverse();
            }
            for (position, route) in order.into_iter().enumerate() {
                let (hits, mut report) = measured(routes[route], || {
                    scan(
                        &db,
                        &data,
                        &queries[query_index],
                        route >= 3,
                        route % 3 == 1,
                        route % 3 == 2,
                        100,
                    )
                })?;
                if !exact_equal(&hits, &winners[query_index][..100.min(documents)]) {
                    return Err("timed_route_mismatch".into());
                }
                report["sample_index"] = json!(index);
                report["query_index"] = json!(query_index);
                report["route_position"] = json!(position);
                measurements[route].push(report);
            }
        }
        for query_index in 0..queries.len() {
            for route in 0..routes.len() {
                let hits = scan(
                    &db,
                    &data,
                    &queries[query_index],
                    route >= 3,
                    route % 3 == 1,
                    route % 3 == 2,
                    25,
                )?;
                if !exact_equal(&hits, &winners[query_index][..25.min(documents)]) {
                    return Err("k25_mismatch".into());
                }
            }
        }
        let results: serde_json::Map<_, _> = routes
            .iter()
            .zip(&measurements)
            .map(|(name, samples)| (name.to_string(), summarize(samples)))
            .collect();
        let result = json!({"format":"issue89-round4-profile-v1","rows":data.ids.len(),"documents":documents,"dimension":dimension,"k":100,"queries":12,"sqlite_pragmas":pragmas,"read_only_probe":summarize(&reads),"preload":preload,"norm_cache_prepare":norm_prepare,"parity_validation":parity,"distance_bits_checked":distances_checked,"full_document_winners_checked":documents*12,"k25_checked_routes":72,"parity_passed":true,"resident_vector_bytes":data.vectors.len(),"norm_cache_bytes":data.norms.len()*8,"resident_identity_bytes":data.ids.len()*16,"resident_capacity_bytes":data.vectors.capacity()+data.norms.capacity()*8+data.ids.capacity()*16,"peak_rss_kib":peak_rss(),"results":results});
        fs::write(output, serde_json::to_vec_pretty(&result)?)?;
        db.execute_batch("ROLLBACK;")?;
        Ok(())
    }

    #[cfg(test)]
    mod profile_tests {
        use super::*;

        #[test]
        fn norm_cache_preserves_distance_bits_and_rejects_invalid_input() {
            for values in [
                vec![1.0, 0.0, -0.0, -1.0],
                vec![1.0e-20, -1.0e-30, f32::from_bits(1), 0.0],
                vec![f32::MAX, -f32::MAX, 1.0, -0.0],
                (0..1024)
                    .map(|i| ((i * 73 % 997) as f32 - 499.0) / 997.0)
                    .collect(),
            ] {
                let blob = encode_vector(&values);
                let mut expected_norm = 0f64;
                for value in &values {
                    let value = *value as f64;
                    expected_norm += value * value;
                }
                let norm = vector_norm(&blob, values.len()).unwrap();
                assert_eq!(norm.to_bits(), expected_norm.to_bits());
                for query in [values.clone(), values.iter().map(|v| -*v).collect()] {
                    let plan = QueryPlan::new(&query, query.len()).unwrap();
                    assert_eq!(
                        cached_cosine(&plan, &blob, norm).unwrap().to_bits(),
                        reference_cosine_blob(&plan, &blob, query.len())
                            .unwrap()
                            .to_bits(),
                    );
                }
            }
            for values in [
                vec![0.0, -0.0],
                vec![f32::NAN, 1.0],
                vec![f32::INFINITY, 1.0],
            ] {
                assert!(vector_norm(&encode_vector(&values), 2).is_err());
            }
            assert!(vector_norm(&[1, 2, 3], 1).is_err());
            let plan = QueryPlan::new(&[1.0, 0.0], 2).unwrap();
            for norm in [0.0, -1.0, f64::NAN, f64::INFINITY] {
                assert!(cached_cosine(&plan, &encode_vector(&[1.0, 0.0]), norm).is_err());
            }
            assert!(cached_cosine(&plan, &[0], 1.0).is_err());
            assert!(cached_cosine(&plan, &encode_vector(&[f32::NAN, 1.0]), 1.0).is_err());
        }

        #[test]
        fn hash_aggregation_preserves_ties_winners_and_short_results() {
            let hits = vec![
                Hit {
                    id: 90,
                    document: 100,
                    distance: 0.1,
                },
                Hit {
                    id: 3,
                    document: 100,
                    distance: 0.1,
                },
                Hit {
                    id: 7,
                    document: 200,
                    distance: 0.1,
                },
                Hit {
                    id: 8,
                    document: 300,
                    distance: 0.2,
                },
                Hit {
                    id: 9,
                    document: 200,
                    distance: 0.3,
                },
                Hit {
                    id: 2,
                    document: 400,
                    distance: -0.0,
                },
                Hit {
                    id: 1,
                    document: 500,
                    distance: 0.0,
                },
            ];
            for k in [1, 3, 25, 100] {
                let tree = aggregate(hits.clone(), false, k);
                let mut reversed = hits.clone();
                reversed.reverse();
                let hash = aggregate(reversed, true, k);
                assert_eq!(tree, hash);
                assert_eq!(
                    tree.iter().map(|h| h.document).collect::<Vec<_>>(),
                    hash.iter().map(|h| h.document).collect::<Vec<_>>()
                );
                assert_eq!(
                    tree.iter().map(|h| h.id).collect::<Vec<_>>(),
                    [2, 1, 3, 7, 8].into_iter().take(k).collect::<Vec<_>>()
                );
            }
        }
    }
}

fn main() {
    if let Err(error) = reference::entry() {
        eprintln!("issue89-round4: {error}");
        std::process::exit(2);
    }
}
