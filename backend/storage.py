"""Owner-authorized local document storage; no application-level encryption.

The API must establish patient ownership before using stored paths. All file
operations are constrained to STORAGE_DIR; paths are never returned to clients.
"""
import os
import re
import uuid
from pathlib import Path
from typing import Tuple
from fastapi import HTTPException, UploadFile

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORAGE_DIR = os.path.join(BASE_DIR, "storage", "documents")
MAX_FILE_SIZE = 15 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf": ".pdf", "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png",
}


def format_file_size(num_bytes: int, ext: str) -> str:
    label = ext.lstrip('.').upper()
    if num_bytes < 1024 * 1024:
        return f"{round(num_bytes / 1024, 1)} KB {label}"
    return f"{round(num_bytes / (1024 * 1024), 1)} MB {label}"


def sanitize_filename(filename: str) -> str:
    # Treat both POSIX and Windows separators as separators, on every platform.
    name = filename.replace(chr(92), '/').rsplit('/', 1)[-1]
    return re.sub(r'[^a-zA-Z0-9_.-]', '_', name) or "document"


def _stored_path(file_path: str) -> Path:
    root = Path(STORAGE_DIR).resolve()
    candidate = Path(file_path).absolute()
    resolved = candidate.resolve()
    if resolved != candidate or not resolved.is_relative_to(root) or resolved == root:
        raise HTTPException(status_code=404, detail="Document file is unavailable. No replacement was generated.")
    return resolved


async def save_uploaded_file(file: UploadFile) -> Tuple[str, str, str, str]:
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_MIME_TYPES:
        ext = Path(file.filename or "").suffix.lower()
        content_type = {".pdf": "application/pdf", ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg", ".png": "image/png"}.get(ext, "")
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF, JPEG and PNG are permitted.")
    original_name = sanitize_filename(file.filename or "medical_record.pdf")
    ext = ALLOWED_MIME_TYPES[content_type]
    storage_path = Path(STORAGE_DIR).resolve() / f"{uuid.uuid4().hex}{ext}"
    bytes_read = 0
    created = False
    try:
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        with storage_path.open("xb") as output:
            created = True
            while chunk := await file.read(64 * 1024):
                bytes_read += len(chunk)
                if bytes_read > MAX_FILE_SIZE:
                    raise HTTPException(status_code=413, detail="File exceeds the maximum allowed size of 15MB.")
                output.write(chunk)
        if not bytes_read:
            raise HTTPException(status_code=400, detail="The selected document is empty.")
    except BaseException as error:
        if created:
            try:
                storage_path.unlink(missing_ok=True)
            except OSError:
                raise HTTPException(status_code=503, detail="Document storage is unavailable. Please contact support.") from None
        if isinstance(error, OSError):
            raise HTTPException(status_code=503, detail="Document storage is unavailable. Please try again later.") from None
        raise
    return original_name, str(storage_path), format_file_size(bytes_read, ext), content_type


def open_stored_file(file_path: str):
    try:
        return _stored_path(file_path).open("rb")
    except (FileNotFoundError, IsADirectoryError):
        raise HTTPException(status_code=404, detail="Document file is unavailable. It may be missing from storage. No replacement was generated.") from None
    except OSError:
        raise HTTPException(status_code=503, detail="Document storage is temporarily unavailable. Please try again later.") from None


def delete_stored_file(file_path: str):
    # Allow an owner to remove a missing record from their index, including old
    # demo entries, but never follow an existing path outside the storage root.
    try:
        Path(file_path).lstat()
    except FileNotFoundError:
        return
    except OSError:
        raise HTTPException(status_code=503, detail="Document storage is unavailable. Please try again later.") from None
    try:
        _stored_path(file_path).unlink(missing_ok=True)
    except OSError:
        raise HTTPException(status_code=503, detail="Document could not be removed from storage. Please try again later.") from None
