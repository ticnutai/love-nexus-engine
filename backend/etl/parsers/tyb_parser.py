"""
TYB Parser — TZ-to-RowID mapping file reader.

תז.TYB structure:
  [Header: 1024 bytes]
  [Records: 8,305,636 × 20 bytes each]

Each record (20 bytes):
  - TZ number (9 bytes ASCII, zero-padded left)
  - Padding (3 bytes null)
  - Sequential index / row_id (4 bytes uint32 LE)
  - Padding (4 bytes null)

File is sorted by TZ → supports binary search.
"""

import mmap
import struct
from pathlib import Path

HEADER_SIZE = 1024
RECORD_SIZE = 20
TZ_SIZE = 9


class TYBParser:
    """Memory-mapped reader for TYB (TZ → row_id) mapping file."""

    def __init__(self, filepath: str | Path):
        self.filepath = Path(filepath)
        self._f = None
        self._mm = None
        self.num_records = 0

    def open(self):
        self._f = open(self.filepath, "rb")
        self._mm = mmap.mmap(self._f.fileno(), 0, access=mmap.ACCESS_READ)
        file_size = self._mm.size()
        self.num_records = (file_size - HEADER_SIZE) // RECORD_SIZE
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

    def read_record(self, index: int) -> tuple[str, int]:
        """Read record at position. Returns (tz_string, seq_index)."""
        offset = HEADER_SIZE + index * RECORD_SIZE
        tz_raw = self._mm[offset : offset + TZ_SIZE]
        seq = struct.unpack_from("<I", self._mm, offset + 12)[0]
        tz_str = tz_raw.decode("ascii", errors="replace").strip()
        return tz_str, seq

    def search_tz(self, tz: str) -> int | None:
        """Binary search for a TZ number. Returns TLB-compatible row index or None.
        
        Note: TYB seq values are offset by 2 from TLB indices.
        This method returns the TLB index (seq - 2) for direct TLB lookup.
        """
        target = tz.zfill(9).encode("ascii")
        lo, hi = 0, self.num_records - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            offset = HEADER_SIZE + mid * RECORD_SIZE
            tz_raw = self._mm[offset : offset + TZ_SIZE]
            if tz_raw == target:
                seq = struct.unpack_from("<I", self._mm, offset + 12)[0]
                return seq - 2  # Convert TYB seq → TLB index
            elif tz_raw < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return None

    def iter_all(self):
        """Iterate all records. Yields (tz_string, seq_index)."""
        for i in range(self.num_records):
            yield self.read_record(i)

    def build_tz_to_row(self) -> dict[str, int]:
        """Build complete TZ → row_id mapping."""
        mapping = {}
        for i in range(self.num_records):
            tz, seq = self.read_record(i)
            if tz:
                mapping[tz] = seq
        return mapping
