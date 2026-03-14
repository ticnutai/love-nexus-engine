"""
ETL Pipeline — Parse all binary files and load into PostgreSQL.

Flow:
  1. Parse תז.TLB → build row_id → TZ array
  2. For each TXB file → invert the inverted index (value → row_ids  ⇒  row_id → value)
  3. Merge all fields by row_id into complete person records
  4. Batch INSERT into PostgreSQL via asyncpg COPY
"""

import asyncio
import time
import sys
from pathlib import Path

import asyncpg

from .parsers.txb_parser import TXBParser
from .parsers.tlb_parser import TLBParser

# TXB files → DB column mapping: (filename_stem, value_field_size, db_column)
TXB_FIELD_MAP: list[tuple[str, int, str]] = [
    ("משפחה", 24, "family_name"),
    ("פרטי", 24, "first_name"),
    ("ישוב", 24, "city"),
    ("אב", 24, "father_name"),
    ("שם קודם", 24, "prev_name"),
    ("רחוב", 20, "street"),
    ("אם", 20, "mother_name"),
    ("טלפון", 20, "phone"),
    ("שנה", 20, "birth_year"),
    ("ארץ לידה", 20, "birth_country"),
    ("תזאב", 20, "father_tz"),
    ("תזאם", 16, "mother_tz"),
    ("חודש", 16, "birth_month"),
    ("יום", 16, "birth_day"),
    ("מצב אישי", 16, "marital"),
    ("חודשעליה", 16, "aliya_month"),
    ("יוםעליה", 16, "aliya_day"),
    ("שנהעליה", 16, "aliya_year"),
    ("טלפונים נוספים", 16, "extra_phones"),
    ("חודשע", 12, "heb_month"),
    ("יוםע", 12, "heb_day"),
    ("יום בשבוע", 12, "birth_dow"),
    ("שנהע", 8, "heb_year"),
    ("מספר", 8, "house_num"),
    ("מיקוד", 8, "zipcode"),
    ("קידומת", 8, "phone_area"),
    ("בית אב", 8, "clan"),
]

# DB columns in order (for COPY)
DB_COLUMNS = [
    "row_id", "tz",
    "family_name", "first_name", "prev_name", "father_name", "mother_name",
    "father_tz", "mother_tz",
    "city", "street", "house_num", "zipcode",
    "phone_area", "phone", "extra_phones",
    "birth_year", "birth_month", "birth_day", "birth_dow",
    "heb_year", "heb_month", "heb_day",
    "aliya_year", "aliya_month", "aliya_day",
    "birth_country", "marital", "clan",
]


def log(msg: str):
    print(f"[ETL] {msg}", flush=True)


def parse_tlb(data_dir: Path) -> list[str]:
    """Step 1: Parse TLB → list where index=row_id, value=TZ string."""
    tlb_path = data_dir / "תז.TLB"
    log(f"Parsing {tlb_path.name}...")
    t0 = time.perf_counter()

    with TLBParser(tlb_path) as tlb:
        row_to_tz = tlb.build_row_to_tz(
            progress_callback=lambda i, n: log(f"  TLB progress: {i:,}/{n:,}")
        )

    log(f"  TLB done: {len(row_to_tz):,} entries in {time.perf_counter()-t0:.1f}s")
    return row_to_tz


def parse_txb_fields(data_dir: Path, total_rows: int) -> dict[str, dict[int, str]]:
    """Step 2: For each TXB file, invert the inverted index.
    
    Returns dict: column_name → { row_id → value }
    """
    field_data: dict[str, dict[int, str]] = {}

    for filename_stem, vfs, col_name in TXB_FIELD_MAP:
        txb_path = data_dir / f"{filename_stem}.TXB"
        if not txb_path.exists():
            log(f"  SKIP {txb_path.name} (not found)")
            continue

        log(f"Parsing {txb_path.name} (V={vfs}) → '{col_name}'...")
        t0 = time.perf_counter()

        with TXBParser(txb_path, vfs) as txb:
            row_map = txb.build_row_to_value(
                progress_callback=lambda i, n: log(f"  {col_name}: {i:,}/{n:,} index entries")
            )

        log(f"  {col_name}: {len(row_map):,} values in {time.perf_counter()-t0:.1f}s")
        field_data[col_name] = row_map

    return field_data


def build_records(
    row_to_tz: list[str],
    field_data: dict[str, dict[int, str]],
) -> list[tuple]:
    """Step 3: Merge all fields by row_id into tuple records for DB COPY."""
    log("Merging records...")
    t0 = time.perf_counter()
    total = len(row_to_tz)
    records = []

    # column order (skip row_id and tz — we handle those manually)
    col_names = DB_COLUMNS[2:]  # everything after row_id, tz

    for row_id in range(total):
        tz = row_to_tz[row_id]
        if not tz:
            continue

        values = [row_id, tz]
        for col in col_names:
            col_data = field_data.get(col)
            values.append(col_data.get(row_id) if col_data else None)

        records.append(tuple(values))

        if row_id % 1_000_000 == 0 and row_id > 0:
            log(f"  Merged {row_id:,}/{total:,}")

    log(f"  Merge done: {len(records):,} records in {time.perf_counter()-t0:.1f}s")
    return records


async def load_to_db(records: list[tuple], dsn: str, schema_path: Path):
    """Step 4: Create table and COPY records into PostgreSQL."""
    log(f"Connecting to PostgreSQL...")
    conn = await asyncpg.connect(dsn)

    try:
        # Create schema
        schema_sql = schema_path.read_text(encoding="utf-8")
        await conn.execute(schema_sql)
        log("Schema created / verified")

        # Truncate for idempotent runs
        await conn.execute("TRUNCATE TABLE people")
        log("Table truncated for fresh load")

        # Batch COPY
        batch_size = 5000
        total = len(records)
        t0 = time.perf_counter()

        for i in range(0, total, batch_size):
            batch = records[i : i + batch_size]
            await conn.copy_records_to_table(
                "people",
                records=batch,
                columns=DB_COLUMNS,
            )
            if (i // batch_size) % 100 == 0:
                log(f"  Loaded {i + len(batch):,}/{total:,} rows")

        elapsed = time.perf_counter() - t0
        rate = total / elapsed if elapsed > 0 else 0
        log(f"  COPY done: {total:,} rows in {elapsed:.1f}s ({rate:,.0f} rows/sec)")

        # Analyze for query planner
        log("Running ANALYZE...")
        await conn.execute("ANALYZE people")
        log("ANALYZE done")

    finally:
        await conn.close()


async def run_pipeline(data_dir: str, dsn: str):
    """Run the complete ETL pipeline."""
    data_path = Path(data_dir)
    schema_path = Path(__file__).parent / "schema.sql"

    log("=" * 60)
    log("Zahauton ETL Pipeline — Starting")
    log(f"Data directory: {data_path}")
    log("=" * 60)

    t_total = time.perf_counter()

    # Step 1: Parse TLB
    row_to_tz = parse_tlb(data_path)

    # Step 2: Parse all TXB files
    field_data = parse_txb_fields(data_path, len(row_to_tz))

    # Step 3: Merge records
    records = build_records(row_to_tz, field_data)

    # Step 4: Load to PostgreSQL
    await load_to_db(records, dsn, schema_path)

    elapsed_total = time.perf_counter() - t_total
    log("=" * 60)
    log(f"Pipeline complete! Total time: {elapsed_total:.1f}s")
    log("=" * 60)


def main():
    """CLI entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Zahauton ETL — Load binary DB to PostgreSQL")
    parser.add_argument("--data-dir", required=True, help="Path to זהותון/ directory")
    parser.add_argument("--dsn", required=True, help="PostgreSQL DSN (e.g. postgresql://user:pass@host:5432/dbname)")
    args = parser.parse_args()

    asyncio.run(run_pipeline(args.data_dir, args.dsn))


if __name__ == "__main__":
    main()
