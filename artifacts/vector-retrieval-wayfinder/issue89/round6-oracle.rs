//! Export the unchanged experimental oracle; never a production runtime seam.
#[allow(dead_code)]
mod reference {
    include!("benchmark.rs");
    use std::io::{BufWriter, Write};

    pub fn export() -> Result<(), Box<dyn Error>> {
        let args: Vec<_> = env::args().collect();
        if args.len() != 7 {
            return Err(
                "usage: oracle DATABASE QUERIES OUTPUT ROW_COUNT DIMENSION QUERY_COUNT".into(),
            );
        }
        let count: usize = args[4].parse()?;
        let dimension: usize = args[5].parse()?;
        let query_count: usize = args[6].parse()?;
        let query_bytes = fs::read(&args[2])?;
        if count == 0 || query_bytes.len() != query_count * dimension * 4 {
            return Err("invalid_export_shape".into());
        }
        let db = Connection::open_with_flags(&args[1], rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY)?;
        db.execute_batch("PRAGMA query_only=ON; BEGIN;")?;
        let actual: i64 = db.query_row(
            "SELECT count(*) FROM vectors WHERE id<=?1",
            [count as i64],
            |r| r.get(0),
        )?;
        if actual != count as i64 {
            return Err("row_count_mismatch".into());
        }
        let mut output = BufWriter::new(
            fs::OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&args[3])?,
        );
        let started = Instant::now();
        for (qi, bytes) in query_bytes.chunks_exact(dimension * 4).enumerate() {
            let query = decode_vector(bytes, dimension)?;
            let plan = QueryPlan::new(&query, dimension)?;
            let mut stmt = db.prepare("SELECT id,vector FROM vectors WHERE id<=?1 ORDER BY id")?;
            let mut rows = stmt.query([count as i64])?;
            let mut seen = 0;
            while let Some(row) = rows.next()? {
                seen += 1;
                if row.get::<_, i64>(0)? != seen as i64 {
                    return Err("noncontiguous_stable_ids".into());
                }
                let score = reference_cosine_blob(&plan, row.get_ref(1)?.as_blob()?, dimension)?;
                output.write_all(&score.to_le_bytes())?;
            }
            eprintln!("{}", json!({"query":qi,"rows":seen}));
        }
        output.flush()?;
        println!(
            "{}",
            json!({"rows":count,"queries":query_count,"dimension":dimension,"wall_ms":started.elapsed().as_secs_f64()*1000.0})
        );
        Ok(())
    }
}

fn main() {
    if let Err(error) = reference::export() {
        eprintln!("{error}");
        std::process::exit(1);
    }
}
