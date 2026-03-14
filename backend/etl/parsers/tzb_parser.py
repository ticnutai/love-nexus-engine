"""
TZB Parser — Normalized search index files.

TZB files exist for: משפחה.TZB, פרטי.TZB, ישוב.TZB, רחוב.TZB
They have the SAME binary format as TXB files, but with:
  - Normalized values (spaces removed, e.g. "א אחמד" → "אאחמד")
  - Different value_field_sizes:
    | File       | Value bytes | Record bytes |
    |------------|-------------|-------------|
    | משפחה.TZB  | 20          | 28          |
    | פרטי.TZB   | 16          | 24          |
    | ישוב.TZB   | 12          | 20          |
    | רחוב.TZB   | 16          | 24          |

Since the format is identical to TXB, we simply reuse TXBParser.
"""

from .txb_parser import TXBParser

# TZB is structurally identical to TXB — just different value_field_sizes
# and normalized (no-space) values.
TZBParser = TXBParser

# Value field sizes for each TZB file
TZB_VALUE_SIZES: dict[str, int] = {
    "משפחה": 20,
    "פרטי": 16,
    "ישוב": 12,
    "רחוב": 16,
}
