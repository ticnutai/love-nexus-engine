"""
TLB Parser — Reverse mapping: row_id → TZ number.

תז.TLB structure:
  - Header: "תז=" (3 bytes, CP1255)
  - Entry 0: 16 bytes (padded with spaces) + "=" (1 byte) = 17 bytes
  - Entry 1+: 9 bytes (TZ digits) + "=" (1 byte) = 10 bytes each
  - Total: ~8,305,635 entries

Usage: Given a sequential row_id (from TXB Data Section),
       look up the corresponding TZ number.
"""

import mmap
from pathlib import Path

HEADER_SIZE = 3          # "תז="
FIRST_ENTRY_SIZE = 17    # 16 chars + "="
ENTRY_SIZE = 10          # 9 digits + "="
FIRST_VALUE_LEN = 16
VALUE_LEN = 9


class TLBParser:
    """Memory-mapped reader for TLB (row_id → TZ) reverse mapping file."""

    def __init__(self, filepath: str | Path):
        self.filepath = Path(filepath)
        self._f = None
        self._mm = None
        self.num_records = 0

    def open(self):
        self._f = open(self.filepath, "rb")
        self._mm = mmap.mmap(self._f.fileno(), 0, access=mmap.ACCESS_READ)
        file_size = self._mm.size()
        # total = header(3) + first_entry(17) + (N-1)*entry(10)
        self.num_records = 1 + (file_size - HEADER_SIZE - FIRST_ENTRY_SIZE) // ENTRY_SIZE
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

    def get_tz(self, seq_index: int) -> str:
        """Look up TZ number by sequential row_id. O(1) random access."""
        if seq_index == 0:
            offset = HEADER_SIZE
            raw = self._mm[offset : offset + FIRST_VALUE_LEN]
        else:
            offset = HEADER_SIZE + FIRST_ENTRY_SIZE + (seq_index - 1) * ENTRY_SIZE
            raw = self._mm[offset : offset + VALUE_LEN]
        return raw.decode("ascii", errors="replace").strip()

    def iter_all(self):
        """Iterate all entries. Yields (seq_index, tz_string)."""
        for i in range(self.num_records):
            yield i, self.get_tz(i)

    def build_row_to_tz(self, progress_callback=None) -> list[str]:
        """Build complete row_id → TZ array (indexed by row_id).
        
        Returns list where list[row_id] = tz_string.
        More memory-efficient than a dict for sequential IDs.
        """
        result = [""] * self.num_records
        for i in range(self.num_records):
            result[i] = self.get_tz(i)
            if progress_callback and i % 500_000 == 0:
                progress_callback(i, self.num_records)
        return result
