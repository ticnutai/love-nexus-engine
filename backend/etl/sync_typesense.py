"""
Typesense Sync — Push people records from PostgreSQL to Typesense.

Usage:
  python -m backend.etl.sync_typesense --dsn postgresql://... --typesense-url http://localhost:8108 --api-key xyz
"""

import asyncio
import json
import time
from pathlib import Path

import asyncpg
import httpx

COLLECTION_NAME = "people"
BATCH_SIZE = 10_000

# Typesense collection schema
COLLECTION_SCHEMA = {
    "name": COLLECTION_NAME,
    "fields": [
        {"name": "tz", "type": "string", "index": True},
        {"name": "family_name", "type": "string", "facet": True, "optional": True},
        {"name": "first_name", "type": "string", "facet": True, "optional": True},
        {"name": "full_name", "type": "string", "optional": True},
        {"name": "prev_name", "type": "string", "optional": True},
        {"name": "father_name", "type": "string", "optional": True},
        {"name": "mother_name", "type": "string", "optional": True},
        {"name": "father_tz", "type": "string", "optional": True, "index": True},
        {"name": "mother_tz", "type": "string", "optional": True, "index": True},
        {"name": "city", "type": "string", "facet": True, "optional": True},
        {"name": "street", "type": "string", "optional": True},
        {"name": "house_num", "type": "string", "optional": True},
        {"name": "phone", "type": "string", "index": True, "optional": True},
        {"name": "phone_area", "type": "string", "optional": True},
        {"name": "birth_year", "type": "string", "optional": True, "facet": True},
        {"name": "birth_country", "type": "string", "optional": True, "facet": True},
        {"name": "marital", "type": "string", "optional": True, "facet": True},
        {"name": "row_id", "type": "int32"},
    ],
    "default_sorting_field": "row_id",
    "token_separators": ["-", " ", "'"],
    "enable_nested_fields": False,
}

DB_QUERY = """
SELECT row_id, tz, family_name, first_name, prev_name, father_name, mother_name,
       father_tz, mother_tz, city, street, house_num, phone, phone_area,
       birth_year, birth_country, marital
FROM people
ORDER BY row_id
"""


def log(msg: str):
    print(f"[Typesense Sync] {msg}", flush=True)


async def create_collection(client: httpx.AsyncClient, base_url: str, api_key: str):
    """Create or recreate the Typesense collection."""
    headers = {"X-TYPESENSE-API-KEY": api_key}

    # Try to delete existing
    resp = await client.delete(f"{base_url}/collections/{COLLECTION_NAME}", headers=headers)
    if resp.status_code == 200:
        log("Deleted existing collection")

    # Create new
    resp = await client.post(f"{base_url}/collections", headers=headers, json=COLLECTION_SCHEMA)
    resp.raise_for_status()
    log("Collection created")


async def sync(dsn: str, typesense_url: str, api_key: str):
    """Full sync: PostgreSQL → Typesense."""
    log("Starting sync...")
    t0 = time.perf_counter()

    async with httpx.AsyncClient(timeout=60.0) as client:
        await create_collection(client, typesense_url, api_key)
        headers = {"X-TYPESENSE-API-KEY": api_key}
        import_url = f"{typesense_url}/collections/{COLLECTION_NAME}/documents/import?action=create"

        conn = await asyncpg.connect(dsn)
        try:
            rows = await conn.fetch(DB_QUERY)
            log(f"Fetched {len(rows):,} rows from PostgreSQL")

            total_imported = 0
            for i in range(0, len(rows), BATCH_SIZE):
                batch = rows[i : i + BATCH_SIZE]
                ndjson_lines = []

                for row in batch:
                    doc = {
                        "id": str(row["row_id"]),
                        "row_id": row["row_id"],
                        "tz": row["tz"],
                    }
                    # Optional fields
                    for col in [
                        "family_name", "first_name", "prev_name", "father_name",
                        "mother_name", "father_tz", "mother_tz", "city", "street",
                        "house_num", "phone", "phone_area", "birth_year",
                        "birth_country", "marital",
                    ]:
                        val = row[col]
                        if val:
                            doc[col] = val

                    # Generate full_name
                    fn = row.get("family_name") or ""
                    gn = row.get("first_name") or ""
                    full = f"{fn} {gn}".strip()
                    if full:
                        doc["full_name"] = full

                    ndjson_lines.append(json.dumps(doc, ensure_ascii=False))

                body = "\n".join(ndjson_lines)
                resp = await client.post(import_url, headers=headers, content=body.encode("utf-8"))
                resp.raise_for_status()

                total_imported += len(batch)
                if (i // BATCH_SIZE) % 10 == 0:
                    log(f"  Imported {total_imported:,}/{len(rows):,}")

        finally:
            await conn.close()

    elapsed = time.perf_counter() - t0
    log(f"Sync complete: {total_imported:,} documents in {elapsed:.1f}s")


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Sync PostgreSQL → Typesense")
    parser.add_argument("--dsn", required=True, help="PostgreSQL DSN")
    parser.add_argument("--typesense-url", default="http://localhost:8108", help="Typesense URL")
    parser.add_argument("--api-key", required=True, help="Typesense API key")
    args = parser.parse_args()

    asyncio.run(sync(args.dsn, args.typesense_url, args.api_key))


if __name__ == "__main__":
    main()
