"""Run isolated unittest fixtures in a writable workspace temp directory."""
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
folder=ROOT/'data/v4/test-temp'
folder.mkdir(parents=True,exist_ok=True)
tempfile.tempdir=str(folder)
suite=unittest.defaultTestLoader.discover(str(ROOT/'tests'),pattern='test_*.py')
result=unittest.TextTestRunner(verbosity=2).run(suite)
sys.exit(0 if result.wasSuccessful() else 1)
