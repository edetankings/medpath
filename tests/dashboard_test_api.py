"""Disposable FastAPI server for the dashboard browser test; never opens project data."""
import sys
import tempfile
import sqlite3
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend import database, storage

if __name__ == '__main__':
    with tempfile.TemporaryDirectory(prefix='medpath-dashboard-e2e-') as folder:
        root = Path(folder).resolve()
        database.DB_PATH = str(root / 'test.sqlite3')
        storage.STORAGE_DIR = str(root / 'documents')
        original_connect = sqlite3.connect
        def confined_connect(target, *args, **kwargs):
            if Path(target).resolve() != Path(database.DB_PATH):
                raise AssertionError('Browser test attempted a non-fixture database connection')
            return original_connect(target, *args, **kwargs)
        sqlite3.connect = confined_connect
        from backend.app import app
        import uvicorn
        uvicorn.run(app, host='127.0.0.1', port=int(sys.argv[1]), log_level='error', access_log=False)
