from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo
import json
import os
import re
import tempfile
import duckdb

ROOT = Path(__file__).resolve().parents[2]
DATA = Path(os.getenv('AGRODECIDE_DATA', str(ROOT / 'data' / 'v4')))

def now():
    return datetime.now(ZoneInfo('America/Lima'))

def atomic_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp = tempfile.mkstemp(dir=path.parent, suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as out:
            json.dump(value, out, ensure_ascii=False, allow_nan=False, indent=2, default=str)
        os.replace(temp, path)
    finally:
        if os.path.exists(temp):
            os.unlink(temp)

@contextmanager
def connection():
    DATA.mkdir(parents=True, exist_ok=True)
    with duckdb.connect(str(DATA / 'warehouse.duckdb')) as conn:
        yield conn

def identifier(name):
    if not re.fullmatch(r'[a-z][a-z0-9_]*', name):
        raise ValueError('Identificador no válido')
    return name

def read(name):
    with connection() as conn:
        if not conn.execute('SELECT count(*) FROM information_schema.tables WHERE table_name=?', [identifier(name)]).fetchone()[0]:
            import pandas as pd
            return pd.DataFrame()
        return conn.execute(f'SELECT * FROM {identifier(name)}').df()

def replace(name, frame):
    if frame.empty:
        raise ValueError(f'No se reemplaza {name} con una tabla vacía')
    with connection() as conn:
        conn.register('incoming', frame)
        conn.execute(f'CREATE OR REPLACE TABLE {identifier(name)} AS SELECT * FROM incoming')
