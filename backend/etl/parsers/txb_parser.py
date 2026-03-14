"""
TXB Parser — Inverted Index file reader for Zahauton database.

TXB file structure:
  [Header: 1024 bytes]
  [Index Section: sorted records of (value, pointer, count)]
  [Data Section: arrays of uint32 row IDs]

Each index record:
  - Value field (V bytes, Windows-1255 encoded, null-padded)
  - Pointer (4 bytes, uint32 LE — file offset to row IDs in Data Section)
  - Count (4 bytes, uint32 LE — number of row IDs)
"""

import mmap
import struct
from pathlib import Path

HEADER_SIZE = 1024


class TXBParser:
    """Memory-mapped reader for TXB inverted index files."""

    def __init__(self, filepath: str | Path, value_field_size: int):
        self.filepath = Path(filepath)
        self.vfs = value_field_size
        self.record_size = value_field_size + 8  # value + ptr(4) + count(4)
        self._f = None
        self._mm = None
        self.data_start = 0
        self.num_records = 0

    def open(self):
        self._f = open(self.filepath, "rb")
        self._mm = mmap.mmap(self._f.fileno(), 0, access=mmap.ACCESS_READ)
        # Read first record's pointer to find where Data Section starts
        ptr_offset = HEADER_SIZE + self.vfs
        self.data_start = struct.unpack_from("<I", self._mm, ptr_offset)[0]
        index_size = self.data_start - HEADER_SIZE
        self.num_records = index_size // self.record_size
        return self

    def close(self):
        if self._mm:
            self._mm.close()
        if self._f:
            self._f.close()

    def __enter__(self):
        return self.open()

    def __exit__(self, *args):
        self.close()

    def _read_record(self, index: int) -> tuple[bytes, int, int]:
        """Read a single index record by position. Returns (raw_value, ptr, count)."""
        offset = HEADER_SIZE + index * self.record_size
        raw_value = self._mm[offset : offset + self.vfs]
        ptr = struct.unpack_from("<I", self._mm, offset + self.vfs)[0]
        count = struct.unpack_from("<I", self._mm, offset + self.vfs + 4)[0]
        return raw_value, ptr, count

    def _decode_value(self, raw: bytes) -> str:
        return raw.rstrip(b"\x00").decode("cp1255", errors="replace").strip()

    def read_record(self, index: int) -> tuple[str, int, int]:
        """Read index record, returning (decoded_value, ptr, count)."""
        raw, ptr, count = self._read_record(index)
        return self._decode_value(raw), ptr, count

    def get_row_ids(self, ptr: int, count: int) -> list[int]:
        """Read row IDs from Data Section at given offset."""
        data = self._mm[ptr : ptr + count * 4]
        return list(struct.unpack(f"<{count}I", data))

    def binary_search(self, target: str) -> tuple[int, int] | None:
        """Binary search for exact value. Returns (ptr, count) or None."""
        target_bytes = target.encode("cp1255").ljust(self.vfs, b"\x00")
        lo, hi = 0, self.num_records - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            raw, ptr, count = self._read_record(mid)
            if raw == target_bytes:
                return ptr, count
            elif raw < target_bytes:
                lo = mid + 1
            else:
                hi = mid - 1
        return None

    def prefix_search(self, prefix: str, max_results: int = 50) -> list[tuple[str, int, int]]:
        """Find all values starting with prefix. Returns list of (value, ptr, count)."""
        prefix_bytes = prefix.encode("cp1255")
        prefix_len = len(prefix_bytes)

        # Binary search for lower bound
        lo, hi = 0, self.num_records - 1
        lower = self.num_records
        while lo <= hi:
            mid = (lo + hi) // 2
            raw, _, _ = self._read_record(mid)
            stripped = raw.rstrip(b"\x00")
            if stripped[:prefix_len] >= prefix_bytes:
                lower = mid
                hi = mid - 1
            else:
                lo = mid + 1

        results = []
        for i in range(lower, min(lower + max_results, self.num_records)):
            raw, ptr, count = self._read_record(i)
            stripped = raw.rstrip(b"\x00")
            if not stripped.startswith(prefix_bytes):
                break
            results.append((self._decode_value(raw), ptr, count))
        return results

    def iter_all(self):
        """Iterate all index records. Yields (value, ptr, count)."""
        for i in range(self.num_records):
            raw, ptr, count = self._read_record(i)
            yield self._decode_value(raw), ptr, count

    def build_row_to_value(self, progress_callback=None) -> dict[int, str]:
        """
        Invert the inverted index: build row_id → value mapping.
        This is used during ETL to reconstruct per-person records.
        """
        row_to_value: dict[int, str] = {}
        for i in range(self.num_records):
            raw, ptr, count = self._read_record(i)
            value = self._decode_value(raw)
            if not value:
                continue
            row_ids = self.get_row_ids(ptr, count)
            for rid in row_ids:
                row_to_value[rid] = value
            if progress_callback and (i + 1) % 10000 == 0:
                progress_callback(i + 1, self.num_records)
        return row_to_value
