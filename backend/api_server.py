"""
Zahauton API Server — Direct binary file reader (no database needed).

Reads directly from the binary זהותון files using mmap parsers.
Serves the same API as the Go Fiber server.

Run: python backend/api_server.py
"""

import sys
import time
from pathlib import Path
from functools import lru_cache

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from backend.etl.parsers.txb_parser import TXBParser
from backend.etl.parsers.tyb_parser import TYBParser
from backend.etl.parsers.tlb_parser import TLBParser

# ─── Configuration ──────────────────────────────────────────
DATA_DIR = Path(__file__).parent.parent / "זהותון"

# TXB field definitions: (filename_stem, value_field_size, field_key)
TXB_FIELDS = [
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

# ─── Global state ──────────────────────────────────────────

# Parsers (opened once, kept in memory)
parsers: dict[str, TXBParser] = {}
tyb: TYBParser | None = None
tlb: TLBParser | None = None

# Search-oriented: field_key → parser
search_parsers: dict[str, tuple[str, TXBParser]] = {}

app = FastAPI(title="Zahauton Search API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Startup: open all parsers ───────────────────────────────

@app.on_event("startup")
def open_parsers():
    global tyb, tlb
    print("[API] Opening binary file parsers...")
    t0 = time.perf_counter()

    # Open TYB
    tyb_path = DATA_DIR / "תז.TYB"
    if tyb_path.exists():
        tyb = TYBParser(tyb_path)
        tyb.open()
        print(f"  TYB: {tyb.num_records:,} records")

    # Open TLB
    tlb_path = DATA_DIR / "תז.TLB"
    if tlb_path.exists():
        tlb = TLBParser(tlb_path)
        tlb.open()
        print(f"  TLB: {tlb.num_records:,} records")

    # Open all TXB parsers
    for stem, vfs, key in TXB_FIELDS:
        path = DATA_DIR / f"{stem}.TXB"
        if path.exists():
            p = TXBParser(path, vfs)
            p.open()
            parsers[key] = p
            search_parsers[key] = (stem, p)
            print(f"  TXB '{stem}' (V={vfs}): {p.num_records:,} index entries")

    elapsed = time.perf_counter() - t0
    print(f"[API] All parsers ready in {elapsed:.2f}s — {len(parsers)} fields loaded")


@app.on_event("shutdown")
def close_parsers():
    for p in parsers.values():
        p.close()
    if tyb:
        tyb.close()
    if tlb:
        tlb.close()
    print("[API] Parsers closed")


# ─── Helpers ─────────────────────────────────────────────────

def get_person_by_row_id(row_id: int) -> dict:
    """Build a complete person record from row_id by reading all TXB files."""
    tz = tlb.get_tz(row_id) if tlb else ""
    person = {"row_id": row_id, "tz": tz}
    for key, p in parsers.items():
        person[key] = None  # default
    return person


def enrich_row_ids(row_ids: list[int], fields: list[str] | None = None) -> list[dict]:
    """Given row_ids, build partial person records with specified fields."""
    if fields is None:
        fields = ["family_name", "first_name", "city", "street", "phone", "birth_year"]

    results = []
    for rid in row_ids:
        tz = tlb.get_tz(rid) if tlb else ""
        person = {"row_id": rid, "tz": tz}
        for key in fields:
            person[key] = None
        results.append(person)

    # Fill in field values from parsers
    for key in fields:
        p = parsers.get(key)
        if not p:
            continue
        # For each value in the index, check if any of our row_ids match
        # This is O(N*M) which is slow for large result sets.
        # For better perf we'd need prebuilt row_id→value maps.
        # But for now, we search per row_id by iterating the matching IDs.

    return results


def search_field(field_key: str, value: str, exact: bool = True) -> list[int]:
    """Search a field by exact or prefix match, return row_ids."""
    p = parsers.get(field_key)
    if not p:
        return []

    if exact:
        result = p.binary_search(value)
        if result:
            ptr, count = result
            return p.get_row_ids(ptr, min(count, 5000))
        return []
    else:
        # prefix search
        matches = p.prefix_search(value, max_results=100)
        row_ids = []
        for val, ptr, count in matches:
            ids = p.get_row_ids(ptr, min(count, 1000))
            row_ids.extend(ids)
            if len(row_ids) >= 5000:
                break
        return row_ids[:5000]


# ─── API Endpoints ───────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "parsers": len(parsers), "total_records": tlb.num_records if tlb else 0}


@app.get("/api/stats")
def stats():
    return {
        "total_people": tlb.num_records if tlb else 0,
        "unique_cities": parsers["city"].num_records if "city" in parsers else 0,
        "unique_family_names": parsers["family_name"].num_records if "family_name" in parsers else 0,
        "with_phone": parsers["phone"].num_records if "phone" in parsers else 0,
    }


@app.get("/api/search")
def search(
    family: str = Query("", description="שם משפחה"),
    first: str = Query("", description="שם פרטי"),
    city: str = Query("", description="עיר"),
    phone: str = Query("", description="טלפון"),
    tz: str = Query("", description="ת.ז."),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """Multi-field search across binary files."""
    family = family.strip()
    first = first.strip()
    city = city.strip()
    phone = phone.strip()
    tz = tz.strip()

    if not any([family, first, city, phone, tz]):
        raise HTTPException(400, "At least one search parameter required")

    # TZ exact lookup — fast path
    if tz:
        if tyb:
            seq = tyb.search_tz(tz)
            if seq is not None:
                person = build_full_person(seq)
                return {"results": [person], "total": 1, "page": 1, "per_page": per_page, "has_more": False}
        return {"results": [], "total": 0, "page": page, "per_page": per_page, "has_more": False}

    # Collect row_id sets from each filter
    sets = []
    if family:
        ids = search_field("family_name", family, exact=False)
        sets.append(set(ids))
    if first:
        ids = search_field("first_name", first, exact=False)
        sets.append(set(ids))
    if city:
        ids = search_field("city", city, exact=False)
        sets.append(set(ids))
    if phone:
        ids = search_field("phone", phone, exact=True)
        sets.append(set(ids))

    if not sets:
        return {"results": [], "total": 0, "page": page, "per_page": per_page, "has_more": False}

    # Intersect all sets
    result_ids = sets[0]
    for s in sets[1:]:
        result_ids = result_ids.intersection(s)

    total = len(result_ids)
    sorted_ids = sorted(result_ids)

    # Paginate
    start = (page - 1) * per_page
    page_ids = sorted_ids[start : start + per_page]

    # Build results (lightweight — just key fields)
    results = []
    for rid in page_ids:
        results.append(build_search_result(rid))

    return {
        "results": results,
        "total": total,
        "page": page,
        "per_page": per_page,
        "has_more": start + per_page < total,
    }


@app.get("/api/person/{tz}")
def get_person(tz: str):
    """Full person lookup by TZ."""
    if not tyb:
        raise HTTPException(500, "TYB parser not loaded")

    seq = tyb.search_tz(tz)
    if seq is None:
        raise HTTPException(404, "Person not found")

    return build_full_person(seq)


@app.get("/api/reverse-phone/{phone}")
def reverse_phone(phone: str):
    """Find people by phone number."""
    ids = search_field("phone", phone.strip(), exact=True)
    results = [build_search_result(rid) for rid in ids[:50]]
    return {"results": results, "count": len(results)}


@app.get("/api/autocomplete")
def autocomplete(
    field: str = Query(..., description="family/first/city/street"),
    prefix: str = Query(..., min_length=2),
    limit: int = Query(10, ge=1, le=50),
):
    """Autocomplete for a given field."""
    field_map = {"family": "family_name", "first": "first_name", "city": "city", "street": "street"}
    key = field_map.get(field)
    if not key:
        raise HTTPException(400, "Invalid field. Use: family, first, city, street")

    p = parsers.get(key)
    if not p:
        raise HTTPException(500, f"Parser for {key} not loaded")

    matches = p.prefix_search(prefix, max_results=limit)
    suggestions = [val for val, ptr, count in matches]

    return {"field": field, "prefix": prefix, "suggestions": suggestions}


@app.get("/api/family-tree/{tz}")
def family_tree(tz: str):
    """Get family tree for a person."""
    if not tyb:
        raise HTTPException(500, "TYB parser not loaded")

    seq = tyb.search_tz(tz)
    if seq is None:
        raise HTTPException(404, "Person not found")

    person = build_full_person(seq)
    tree = {"person": person}

    # Father
    if person.get("father_tz"):
        f_seq = tyb.search_tz(person["father_tz"])
        if f_seq is not None:
            tree["father"] = build_full_person(f_seq)

    # Mother
    if person.get("mother_tz"):
        m_seq = tyb.search_tz(person["mother_tz"])
        if m_seq is not None:
            tree["mother"] = build_full_person(m_seq)

    # Children — people whose father_tz or mother_tz == this TZ
    children = []
    father_tz_parser = parsers.get("father_tz")
    mother_tz_parser = parsers.get("mother_tz")

    if father_tz_parser:
        result = father_tz_parser.binary_search(tz)
        if result:
            ptr, count = result
            child_ids = father_tz_parser.get_row_ids(ptr, min(count, 100))
            children.extend(child_ids)

    if mother_tz_parser:
        result = mother_tz_parser.binary_search(tz)
        if result:
            ptr, count = result
            child_ids = mother_tz_parser.get_row_ids(ptr, min(count, 100))
            children.extend(child_ids)

    if children:
        tree["children"] = [build_search_result(rid) for rid in set(children)]

    # Siblings — same father_tz or mother_tz
    sibling_ids = set()
    if person.get("father_tz") and father_tz_parser:
        result = father_tz_parser.binary_search(person["father_tz"])
        if result:
            ptr, count = result
            sibs = father_tz_parser.get_row_ids(ptr, min(count, 50))
            sibling_ids.update(sibs)
    if person.get("mother_tz") and mother_tz_parser:
        result = mother_tz_parser.binary_search(person["mother_tz"])
        if result:
            ptr, count = result
            sibs = mother_tz_parser.get_row_ids(ptr, min(count, 50))
            sibling_ids.update(sibs)

    sibling_ids.discard(seq)  # Remove self
    if sibling_ids:
        tree["siblings"] = [build_search_result(rid) for rid in sibling_ids]

    # ── Uncles/Aunts: siblings of each parent ──
    for parent_key, parent_label in [("father", "father"), ("mother", "mother")]:
        parent_person = tree.get(parent_key)
        if not parent_person:
            continue
        uncle_aunt_ids = set()
        p_father_tz = parent_person.get("father_tz")
        p_mother_tz = parent_person.get("mother_tz")
        if p_father_tz and father_tz_parser:
            result = father_tz_parser.binary_search(p_father_tz)
            if result:
                ptr, count = result
                uncle_aunt_ids.update(father_tz_parser.get_row_ids(ptr, min(count, 50)))
        if p_mother_tz and mother_tz_parser:
            result = mother_tz_parser.binary_search(p_mother_tz)
            if result:
                ptr, count = result
                uncle_aunt_ids.update(mother_tz_parser.get_row_ids(ptr, min(count, 50)))
        # Remove parent from their own siblings
        uncle_aunt_ids.discard(parent_person["row_id"])
        if uncle_aunt_ids:
            tree[f"uncles_aunts_{parent_label}"] = [build_search_result(rid) for rid in uncle_aunt_ids]

    # ── Cousins: children of uncles/aunts ──
    cousin_ids = set()
    for parent_label in ["father", "mother"]:
        ua_key = f"uncles_aunts_{parent_label}"
        if ua_key not in tree:
            continue
        for ua in tree[ua_key]:
            ua_tz = ua.get("tz")
            if not ua_tz:
                continue
            if father_tz_parser:
                result = father_tz_parser.binary_search(ua_tz)
                if result:
                    ptr, count = result
                    cousin_ids.update(father_tz_parser.get_row_ids(ptr, min(count, 50)))
            if mother_tz_parser:
                result = mother_tz_parser.binary_search(ua_tz)
                if result:
                    ptr, count = result
                    cousin_ids.update(mother_tz_parser.get_row_ids(ptr, min(count, 50)))
    cousin_ids.discard(seq)
    if cousin_ids:
        tree["cousins"] = [build_search_result(rid) for rid in cousin_ids]

    return tree


@app.get("/api/neighbors/{tz}")
def neighbors(tz: str, radius: int = Query(10, ge=1, le=100)):
    """Find neighbors — same street & city, house number within ±radius."""
    if not tyb:
        raise HTTPException(500, "TYB not loaded")
    seq = tyb.search_tz(tz)
    if seq is None:
        raise HTTPException(404, "Person not found")
    person = build_full_person(seq)
    p_city = person.get("city")
    p_street = person.get("street")
    if not p_city or not p_street:
        return {"person": person, "neighbors": []}

    # Get all people on same street & city
    street_ids = set(search_field("street", p_street, exact=True))
    city_ids = set(search_field("city", p_city, exact=True))
    same_block = street_ids & city_ids
    same_block.discard(seq)

    result = []
    p_house = person.get("house_num", "")
    try:
        p_num = int(p_house)
    except (ValueError, TypeError):
        p_num = None

    for rid in same_block:
        r = build_search_result(rid)
        if p_num is not None:
            h = _prebuilt_maps.get("house_num", {}).get(rid, "")
            try:
                if abs(int(h) - p_num) > radius:
                    continue
            except (ValueError, TypeError):
                pass
        result.append(r)
        if len(result) >= 200:
            break

    return {"person": person, "neighbors": result, "total": len(result)}


@app.get("/api/neighborhood/{tz}")
def neighborhood(tz: str):
    """Find people in same city & nearby streets — the neighborhood concept."""
    if not tyb:
        raise HTTPException(500, "TYB not loaded")
    seq = tyb.search_tz(tz)
    if seq is None:
        raise HTTPException(404, "Person not found")
    person = build_full_person(seq)
    p_city = person.get("city")
    p_street = person.get("street")
    if not p_city:
        return {"person": person, "streets": []}

    city_ids = set(search_field("city", p_city, exact=True))

    # Get unique streets in this city with counts
    street_map = _prebuilt_maps.get("street", {})
    street_counts: dict[str, int] = {}
    for rid in city_ids:
        s = street_map.get(rid)
        if s:
            street_counts[s] = street_counts.get(s, 0) + 1

    # Sort by proximity: person's street first, then by count
    streets = []
    for name, count in sorted(street_counts.items(), key=lambda x: (-1 if x[0] == p_street else 0, -x[1])):
        streets.append({"name": name, "count": count})
        if len(streets) >= 100:
            break

    return {"person": person, "city": p_city, "streets": streets, "total_in_city": len(city_ids)}


@app.get("/api/city-people/{tz}")
def city_people(
    tz: str,
    street: str = Query("", description="filter by street"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """People in the same city, optionally filtered by street."""
    if not tyb:
        raise HTTPException(500, "TYB not loaded")
    seq = tyb.search_tz(tz)
    if seq is None:
        raise HTTPException(404, "Person not found")
    person = build_full_person(seq)
    p_city = person.get("city")
    if not p_city:
        return {"person": person, "results": [], "total": 0}

    city_ids = set(search_field("city", p_city, exact=True))
    if street:
        street_ids = set(search_field("street", street, exact=True))
        city_ids = city_ids & street_ids

    total = len(city_ids)
    sorted_ids = sorted(city_ids)
    start = (page - 1) * per_page
    page_ids = sorted_ids[start:start + per_page]
    results = [build_search_result(rid) for rid in page_ids]

    return {"person": person, "results": results, "total": total, "page": page, "per_page": per_page, "has_more": start + per_page < total}


@app.get("/api/age-group/{tz}")
def age_group(
    tz: str,
    range_years: int = Query(2, ge=0, le=20),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    """People born in same year ± range, optionally same city."""
    if not tyb:
        raise HTTPException(500, "TYB not loaded")
    seq = tyb.search_tz(tz)
    if seq is None:
        raise HTTPException(404, "Person not found")
    person = build_full_person(seq)
    p_year = person.get("birth_year")
    if not p_year:
        return {"person": person, "results": [], "total": 0}

    try:
        year = int(p_year)
    except (ValueError, TypeError):
        return {"person": person, "results": [], "total": 0}

    # Collect all people in year range
    year_ids = set()
    birth_parser = parsers.get("birth_year")
    if birth_parser:
        for y in range(year - range_years, year + range_years + 1):
            result = birth_parser.binary_search(str(y))
            if result:
                ptr, count = result
                year_ids.update(birth_parser.get_row_ids(ptr, min(count, 10000)))

    year_ids.discard(seq)
    total = len(year_ids)
    sorted_ids = sorted(year_ids)
    start = (page - 1) * per_page
    page_ids = sorted_ids[start:start + per_page]
    results = [build_search_result(rid) for rid in page_ids]

    return {"person": person, "results": results, "total": total, "page": page, "per_page": per_page, "has_more": start + per_page < total, "year_range": [year - range_years, year + range_years]}


# ─── Record builders ─────────────────────────────────────────

def get_field_value(field_key: str, row_id: int) -> str | None:
    """Look up a single field value for a row_id.
    
    This uses binary search on each index entry's row_id list.
    For a full scan approach, we iterate index entries.
    """
    p = parsers.get(field_key)
    if not p:
        return None

    # For fields with few unique values, iterate all index entries
    # and check if row_id is in the data
    # This is the slow approach — for production, use prebuilt maps.
    # But for small lookups it's fine (binary search within each data array).

    # Optimized: we do a full scan of the index
    # For each entry, we check if the pointer range could contain our row_id
    for i in range(p.num_records):
        raw, ptr, count = p._read_record(i)
        if count == 0:
            continue
        # Read the row IDs and check
        # For massive lists, this is slow. We read only if plausible.
        # Quick check: read first and last ID (they might be sorted)
        import struct as st
        first_id = st.unpack_from("<I", p._mm, ptr)[0]
        last_id = st.unpack_from("<I", p._mm, ptr + (count - 1) * 4)[0]
        if first_id <= row_id <= last_id:
            ids = p.get_row_ids(ptr, count)
            if row_id in ids:
                return p._decode_value(raw)
    return None


# Prebuilt row_id → value maps for key search fields (built at startup)
_prebuilt_maps: dict[str, dict[int, str]] = {}
_prebuilt_fields = ["family_name", "first_name", "city", "street", "phone", "birth_year",
                     "father_name", "mother_name", "father_tz", "mother_tz",
                     "prev_name", "phone_area", "house_num", "zipcode",
                     "birth_month", "birth_day", "birth_dow", "birth_country",
                     "marital", "clan", "heb_year", "heb_month", "heb_day",
                     "aliya_year", "aliya_month", "aliya_day", "extra_phones"]


@app.on_event("startup")
def prebuild_maps():
    """Build row_id → value maps for all fields. Takes ~2-5 min for 8.3M records."""
    print("[API] Pre-building row_id → value maps (this may take a few minutes)...")
    t0 = time.perf_counter()

    for key in _prebuilt_fields:
        p = parsers.get(key)
        if not p:
            continue
        ft = time.perf_counter()
        _prebuilt_maps[key] = p.build_row_to_value()
        print(f"  {key}: {len(_prebuilt_maps[key]):,} values in {time.perf_counter()-ft:.1f}s")

    elapsed = time.perf_counter() - t0
    print(f"[API] All maps built in {elapsed:.1f}s")


def build_full_person(row_id: int) -> dict:
    """Build complete person record using prebuilt maps."""
    tz = tlb.get_tz(row_id) if tlb else ""
    person = {"row_id": row_id, "tz": tz}
    for key in _prebuilt_fields:
        m = _prebuilt_maps.get(key)
        person[key] = m.get(row_id) if m else None
    return person


def build_search_result(row_id: int) -> dict:
    """Build lightweight search result."""
    tz = tlb.get_tz(row_id) if tlb else ""
    result = {"row_id": row_id, "tz": tz}
    for key in ["family_name", "first_name", "city", "street", "phone", "birth_year"]:
        m = _prebuilt_maps.get(key)
        result[key] = m.get(row_id) if m else None
    return result


# ─── Main ─────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(
        "backend.api_server:app",
        host="0.0.0.0",
        port=3001,
        reload=False,
        log_level="info",
    )
