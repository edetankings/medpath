#!/usr/bin/env python3
"""Start the development API on loopback; network binding requires --host."""
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("legacy_port", nargs="?", type=int)
    parser.add_argument("--port", type=int)
    parser.add_argument("--host", default="127.0.0.1")
    args = parser.parse_args()
    try:
        import uvicorn
    except ImportError:
        parser.exit(1, "Install backend dependencies: python -m pip install -r backend/requirements.txt\n")
    port = args.port if args.port is not None else (args.legacy_port or 8000)
    uvicorn.run("app:app", app_dir=str(Path(__file__).resolve().parent),
                host=args.host, port=port, reload=True)

if __name__ == "__main__":
    main()
