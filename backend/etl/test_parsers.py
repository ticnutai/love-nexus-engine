"""
Test parsers against real זהותון binary files.
Run: python -m backend.etl.test_parsers
"""

import sys
from pathlib import Path

# Adjust path for running as module
DATA_DIR = Path(__file__).parent.parent.parent / "זהותון"

from .parsers.txb_parser import TXBParser
from .parsers.tyb_parser import TYBParser
from .parsers.tlb_parser import TLBParser


def test_txb():
    """Test TXB parser — read first 10 entries from משפחה.TXB."""
    print("=" * 50)
    print("TEST: TXB Parser (משפחה.TXB, V=24)")
    print("=" * 50)

    path = DATA_DIR / "משפחה.TXB"
    if not path.exists():
        print(f"  SKIP: {path} not found")
        return

    with TXBParser(path, 24) as txb:
        print(f"  Total index records: {txb.num_records:,}")
        print(f"  Data section starts at offset: {txb.data_start:,}")
        print()
        print("  First 10 entries:")
        for i in range(min(10, txb.num_records)):
            value, ptr, count = txb.read_record(i)
            print(f"    [{i}] '{value}' → ptr={ptr:,}, count={count:,}")

        print()
        # Try reading row IDs for the first entry
        value, ptr, count = txb.read_record(0)
        if count > 0:
            row_ids = txb.get_row_ids(ptr, min(count, 5))
            print(f"  First {len(row_ids)} row IDs for '{value}': {row_ids}")

        # Test search for common name
        print()
        for name in ["כהן", "לוי", "אברהם"]:
            result = txb.binary_search(name)
            if result:
                ptr, count = result
                print(f"  Search '{name}': found, count={count:,}")
            else:
                print(f"  Search '{name}': NOT FOUND")

        # Test prefix
        print()
        prefix_results = txb.prefix_search("כה", max_results=5)
        print(f"  Prefix 'כה': {len(prefix_results)} results")
        for val, ptr, cnt in prefix_results:
            print(f"    '{val}' count={cnt:,}")

    print()


def test_tyb():
    """Test TYB parser — read entries and try binary search."""
    print("=" * 50)
    print("TEST: TYB Parser (תז.TYB)")
    print("=" * 50)

    path = DATA_DIR / "תז.TYB"
    if not path.exists():
        print(f"  SKIP: {path} not found")
        return

    with TYBParser(path) as tyb:
        print(f"  Total records: {tyb.num_records:,}")
        print()
        print("  First 10 entries:")
        for i in range(min(10, tyb.num_records)):
            tz, seq = tyb.read_record(i)
            print(f"    [{i}] TZ='{tz}' → seq={seq}")

        # Test binary search (using a TZ we just read)
        print()
        tz_sample, seq_sample = tyb.read_record(5)
        found = tyb.search_tz(tz_sample)
        print(f"  Search TZ '{tz_sample}': seq={found} (expected {seq_sample})")
        assert found == seq_sample, "MISMATCH!"
        print("  ✓ Binary search verified")

    print()


def test_tlb():
    """Test TLB parser — read entries and verify round-trip."""
    print("=" * 50)
    print("TEST: TLB Parser (תז.TLB)")
    print("=" * 50)

    path = DATA_DIR / "תז.TLB"
    if not path.exists():
        print(f"  SKIP: {path} not found")
        return

    with TLBParser(path) as tlb:
        print(f"  Total records: {tlb.num_records:,}")
        print()
        print("  First 10 entries:")
        for i in range(min(10, tlb.num_records)):
            tz = tlb.get_tz(i)
            print(f"    [{i}] TZ='{tz}'")

    print()


def test_round_trip():
    """Test TYB→TLB round trip: TZ → seq → TZ."""
    print("=" * 50)
    print("TEST: Round-trip TYB → TLB")
    print("=" * 50)

    tyb_path = DATA_DIR / "תז.TYB"
    tlb_path = DATA_DIR / "תז.TLB"
    if not tyb_path.exists() or not tlb_path.exists():
        print("  SKIP: files not found")
        return

    with TYBParser(tyb_path) as tyb, TLBParser(tlb_path) as tlb:
        # Pick 5 random TZs from TYB, look them up in TLB
        test_indices = [1, 100, 1000, 10000, 100000]
        for idx in test_indices:
            if idx >= tyb.num_records:
                continue
            tz_from_tyb, seq = tyb.read_record(idx)
            tz_from_tlb = tlb.get_tz(seq)
            match = "✓" if tz_from_tyb == tz_from_tlb else "✗ MISMATCH"
            print(f"  TYB[{idx}]: TZ='{tz_from_tyb}' → seq={seq} → TLB: '{tz_from_tlb}' {match}")

    print()


def test_full_lookup():
    """Test complete lookup: name → row_ids → TZ numbers."""
    print("=" * 50)
    print("TEST: Full lookup — name → row IDs → TZ")
    print("=" * 50)

    txb_path = DATA_DIR / "משפחה.TXB"
    tlb_path = DATA_DIR / "תז.TLB"
    if not txb_path.exists() or not tlb_path.exists():
        print("  SKIP: files not found")
        return

    with TXBParser(txb_path, 24) as txb, TLBParser(tlb_path) as tlb:
        result = txb.binary_search("כהן")
        if not result:
            print("  'כהן' not found — trying other names")
            return

        ptr, count = result
        print(f"  'כהן': {count:,} people")
        
        # Get first 5 row IDs
        row_ids = txb.get_row_ids(ptr, min(count, 5))
        print(f"  First {len(row_ids)} row IDs: {row_ids}")
        
        # Look up TZ for each
        for rid in row_ids:
            tz = tlb.get_tz(rid)
            print(f"    row_id={rid} → TZ='{tz}'")

    print()


if __name__ == "__main__":
    test_txb()
    test_tyb()
    test_tlb()
    test_round_trip()
    test_full_lookup()
    print("All tests completed!")
