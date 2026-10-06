//! Isolated scale measurements using the existing issue89 reference implementation.
#[allow(dead_code)]
mod reference {
    include!("benchmark.rs");

    fn raw_unfiltered(
        db: &Connection,
        query: &[f32],
        k: usize,
    ) -> Result<Vec<Hit>, Box<dyn Error>> {
        let sql = "WITH knn AS MATERIALIZED (SELECT rowid,distance,document_id FROM vectors_vec WHERE embedding MATCH ? AND k = ? ORDER BY distance) SELECT rowid,distance,document_id FROM knn ORDER BY distance,rowid";
        Ok(db
            .prepare(sql)?
            .query_map(params![encode_vector(query), k as i64], |r| {
                Ok(Hit {
                    id: r.get(0)?,
                    distance: r.get(1)?,
                    document: r.get(2)?,
                })
            })?
            .collect::<rusqlite::Result<Vec<_>>>()?)
    }

    fn summarize(samples: &[f64]) -> Value {
        json!({"samples":samples.len(),"p50_ms":percentile(samples,0.5),"p95_ms":percentile(samples,0.95),"min_ms":samples.iter().copied().reduce(f64::min),"max_ms":samples.iter().copied().reduce(f64::max),"sample_ms":samples})
    }

    pub fn entry() -> Result<(), Box<dyn Error>> {
        let args: Vec<String> = env::args().collect();
        if args.get(1).map(String::as_str) == Some("build") {
            if args.len() != 6 {
                return Err("build <manifest> <output> <papers> <rust|vec0>".into());
            }
            if Path::new(&args[3]).exists() {
                return Err("fresh_output_required".into());
            }
            return run_manifest(
                Path::new(&args[2]),
                Path::new(&args[3]),
                args[4].parse()?,
                30,
                &args[5],
                None,
                "ingest-only",
                false,
            );
        }
        if args.len() != 7 || args[1] != "query" {
            return Err(
                "query <rust_database> <vec0_database> <queries.f32> <output> <dimension>".into(),
            );
        }
        let output = Path::new(&args[5]);
        if output.exists() {
            return Err("fresh_output_required".into());
        }
        let dimension: usize = args[6].parse()?;
        let bytes = fs::read(&args[4])?;
        if dimension == 0 || bytes.len() != 12 * dimension * 4 {
            return Err("expected_twelve_frozen_queries".into());
        }
        let queries = bytes
            .chunks_exact(dimension * 4)
            .map(|b| decode_vector(b, dimension))
            .collect::<Result<Vec<_>, _>>()?;
        let ordinary = open(Path::new(&args[2]))?;
        let accelerated = open(Path::new(&args[3]))?;
        let counts = |db: &Connection| -> rusqlite::Result<(i64, i64)> {
            db.query_row(
                "SELECT COUNT(*),COUNT(DISTINCT document_id) FROM vectors",
                [],
                |r| Ok((r.get(0)?, r.get(1)?)),
            )
        };
        let (rows, documents) = counts(&ordinary)?;
        if counts(&accelerated)? != (rows, documents) {
            return Err("database_shape_mismatch".into());
        }
        // Independent small reconstruction before formal samples: compare stored
        // identities and vectors at bounded positions in both actual databases.
        for id in [1, rows / 2, rows] {
            let get = |db: &Connection| -> rusqlite::Result<(i64, Vec<u8>)> {
                db.query_row(
                    "SELECT document_id,vector FROM vectors WHERE id=?",
                    [id],
                    |r| Ok((r.get(0)?, r.get(1)?)),
                )
            };
            if get(&ordinary)? != get(&accelerated)? {
                return Err("stored_input_mismatch".into());
            }
        }
        let scope = Scope::default();
        let mut reports = Vec::new();
        for k in K_VALUES {
            let mut frag_ms = Vec::new();
            let mut doc_ms = Vec::new();
            let mut knn_ms = Vec::new();
            let mut samples = Vec::new();
            for index in 0..30 {
                let query = &queries[index % queries.len()];
                let mut fragment = Vec::new();
                let mut document = Vec::new();
                let mut raw = Vec::new();
                let routes = if index % 2 == 0 { [0, 1, 2] } else { [2, 1, 0] };
                for route in routes {
                    let started = Instant::now();
                    match route {
                        0 => {
                            fragment = rust_scan(&ordinary, query, &scope, k, dimension)?.0;
                            frag_ms.push(started.elapsed().as_secs_f64() * 1000.0);
                        }
                        1 => {
                            document = rust_document_scan(&ordinary, query, &scope, k, dimension)?;
                            doc_ms.push(started.elapsed().as_secs_f64() * 1000.0);
                        }
                        _ => {
                            raw = raw_unfiltered(&accelerated, query, k)?;
                            knn_ms.push(started.elapsed().as_secs_f64() * 1000.0);
                        }
                    }
                }
                let ids = |hits: &[Hit]| {
                    hits.iter()
                        .map(|h| h.id)
                        .collect::<std::collections::BTreeSet<_>>()
                };
                samples.push(json!({"query_index":index%queries.len(),"order":routes,"raw_knn_reference_identity_set_matches":ids(&fragment)==ids(&raw),"raw_knn_reference_identity_order_distance_matches":same_hits(&fragment,&raw),"rust_fragment_ids":fragment.iter().map(|h|h.id).collect::<Vec<_>>(),"rust_document_ids":document.iter().map(|h|h.document).collect::<Vec<_>>(),"raw_knn_ids":raw.iter().map(|h|h.id).collect::<Vec<_>>()}));
                eprintln!(
                    "{}",
                    json!({"phase":"query","k":k,"samples":index+1,"total":30,"rust_document_ms":doc_ms.last(),"rust_fragment_ms":frag_ms.last(),"raw_knn_ms":knn_ms.last(),"rows":rows,"peak_rss_kib":peak_rss()})
                );
            }
            reports.push(json!({"k":k,"rust_exact_fragment":summarize(&frag_ms),"rust_exact_complete_document_aggregation":summarize(&doc_ms),"vec0_unfiltered_raw_knn_exploratory":summarize(&knn_ms),"identity_set_equal_samples":samples.iter().filter(|s|s["raw_knn_reference_identity_set_matches"]==true).count(),"ordered_identity_distance_equal_samples":samples.iter().filter(|s|s["raw_knn_reference_identity_order_distance_matches"]==true).count(),"samples_private":samples}));
        }
        let result = json!({"format":"issue89-round3-scale-v1","dimension":dimension,"rows":rows,"documents":documents,"query_count":queries.len(),"repeats_per_k_route":30,"scope":"all","route_order":"alternate Rust-fragment/document/KNN and KNN/document/Rust-fragment","exact_document_route":"full eligible scan on independently built ordinary SQLite database; best reference fragment per document then top-k","raw_knn_exact_reference_claim":false,"peak_query_rss_kib":peak_rss(),"database_bytes":{"rust":file_size(Path::new(&args[2]))?,"vec0":file_size(Path::new(&args[3]))?},"results":reports});
        fs::write(output, serde_json::to_vec_pretty(&result)?)?;
        Ok(())
    }

    #[cfg(test)]
    mod scale_tests {
        use super::*;
        #[test]
        fn unfiltered_knn_tie_agreement_must_distinguish_set_and_order() {
            let db = test_db();
            create_vec_schema(&db, 2).unwrap();
            for id in [1, 2, 3, 4] {
                let v = encode_vector(&[1.0, 0.0]);
                db.execute("INSERT INTO vectors(id,document_id,source_id,library_id,kind,item_type,section,vector) VALUES(?1,?1,?1,1,1,0,0,?2)",params![id,v]).unwrap();
                db.execute("INSERT INTO vectors_vec(rowid,embedding,library_id,kind,item_type,section,document_id) VALUES(?1,?2,1,1,0,0,?1)",params![id,v]).unwrap();
            }
            let raw = raw_unfiltered(&db, &[1.0, 0.0], 2).unwrap();
            let exact = rust_scan(&db, &[1.0, 0.0], &Scope::default(), 2, 2)
                .unwrap()
                .0;
            assert_eq!(exact.iter().map(|h| h.id).collect::<Vec<_>>(), [1, 2]);
            assert_eq!(raw.len(), 2);
            assert!(!same_hits(&raw, &exact));
        }
    }
}
fn main() {
    if let Err(error) = reference::entry() {
        eprintln!("issue89-round3: {error}");
        std::process::exit(2);
    }
}
