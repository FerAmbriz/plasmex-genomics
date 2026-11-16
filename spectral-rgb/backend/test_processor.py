"""Tests rápidos del motor RGB. Ejecutar: python test_processor.py"""
import sys
sys.path.insert(0, ".")
from processor import encode_sequence, build_fingerprint, sequence_metadata, validate_accession

# 156 nt -> side 13, pad 13 (6+7), shape (13,13,3)
arr = encode_sequence("ACGT" * 39)
assert arr.shape == (13, 13, 3), arr.shape
assert arr.dtype.name == "uint8"
assert tuple(arr[6, 0]) == (255, 92, 92)  # primera base real tras pad izq: A
meta = sequence_metadata("ACGT" * 39, "DEMO")
assert meta["length_bp"] == 156 and meta["matrix_resolution"] == "13x13"
assert meta["gc_percent"] == 50.0
assert validate_accession("NC_045512.2") == "NC_045512.2"
try:
    validate_accession("nope!!!")
    raise SystemExit("debería fallar")
except ValueError:
    pass
img = build_fingerprint("ACGT" * 39, scale=8)
assert img.size == (104, 104)
print("OK: processor.py — shape (13,13,3), GC 50%, PNG 104x104, validación NCBI")
