"""Task 2 regression suite. Every SQLite connection is confined to a temporary DB."""
import asyncio
from contextlib import ExitStack, closing
import hashlib
import io
import json
from pathlib import Path
import re
import sqlite3
import tempfile
import unittest
from typing import get_args
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
from starlette.datastructures import UploadFile, Headers
from backend import database, storage
from backend.app import app
from backend.models import DocumentCategory

ROOT = Path(__file__).resolve().parents[1]
PDF = b"%PDF-1.4\n% Synthetic document fixture\n%%EOF\n"

class MedicalDocumentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="medpath-documents-test-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.db = self.root / "test.sqlite3"
        self.documents = self.root / "documents"
        self.stack = ExitStack()
        self.addCleanup(self.stack.close)
        self.stack.enter_context(patch.object(database, "DB_PATH", str(self.db)))
        self.stack.enter_context(patch.object(storage, "STORAGE_DIR", str(self.documents)))
        original_connect = sqlite3.connect
        def confined_connect(target, *args, **kwargs):
            if Path(target).resolve() != self.db:
                raise AssertionError("Test attempted a non-fixture database connection")
            return original_connect(target, *args, **kwargs)
        self.stack.enter_context(patch("sqlite3.connect", side_effect=confined_connect))
        self.client = self.stack.enter_context(TestClient(app, raise_server_exceptions=False))
        self.a = self.signup("alice")
        self.b = self.signup("bob")
        self.headers_a = {"Authorization": "Bearer " + self.a["token"]}
        self.headers_b = {"Authorization": "Bearer " + self.b["token"]}

    def signup(self, name, **extra):
        response = self.client.post("/api/auth/signup", json={
            "email": f"{name}@fixture.example", "password": "Synthetic-Test-Password-Only!",
            "firstName": name, "lastName": "Fixture", **extra,
        })
        self.assertEqual(response.status_code, 201)
        return response.json()

    def rows(self, query, args=()):
        with closing(database.get_db_connection()) as conn:
            return conn.execute(query, args).fetchall()

    def execute(self, query, args=()):
        with closing(database.get_db_connection()) as conn, conn:
            conn.execute(query, args)

    def upload(self, headers=None, data=None, content=PDF, name="clinical-report.pdf", mime="application/pdf"):
        return self.client.post("/api/passport/documents/upload",
            headers=self.headers_a if headers is None else headers,
            data={"title": "Fixture report", "category": "Lab Results", "issuing_doctor": "Dr. Test", **(data or {})},
            files={"file": (name, content, mime)})

    def assert_no_upload(self):
        self.assertEqual(self.rows("SELECT COUNT(*) FROM medical_documents")[0][0], 0)
        self.assertEqual(self.rows("SELECT COUNT(*) FROM timeline_events")[0][0], 0)
        self.assertEqual(list(self.documents.glob("*")), [])

    def test_signup_unknown_is_null_in_db_and_all_profile_responses(self):
        self.assertIsNone(self.a["user"]["bloodGroup"])
        self.assertIsNone(self.rows("SELECT blood_group FROM profiles WHERE user_id=?", (self.a["user"]["id"],))[0][0])
        for route in ["/api/auth/me", "/api/profile", "/api/passport"]:
            response = self.client.get(route, headers=self.headers_a)
            self.assertEqual(response.status_code, 200)
            result = response.json()
            self.assertIsNone((result["profile"] if route.endswith("passport") else result)["bloodGroup"])
        login = self.client.post("/api/auth/login", json={"email": "alice@fixture.example", "password": "Synthetic-Test-Password-Only!"})
        self.assertEqual(login.status_code, 200)
        self.assertIsNone(login.json()["user"]["bloodGroup"])

    def test_explicit_blood_type_preserved_unless_patient_changes_it(self):
        patient = self.signup("carol", bloodGroup="AB-")
        headers = {"Authorization": "Bearer " + patient["token"]}
        response = self.client.put("/api/profile", headers=headers, json={"phoneNumber": "fixture"})
        self.assertEqual(response.json()["bloodGroup"], "AB-")
        response = self.client.put("/api/profile", headers=headers, json={"bloodGroup": None})
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.json()["bloodGroup"])
        self.assertIsNone(self.rows("SELECT blood_group FROM profiles WHERE user_id=?", (patient["user"]["id"],))[0][0])

    def test_blank_blood_type_becomes_null_and_invalid_type_rejected(self):
        self.assertIsNone(self.signup("blank", bloodGroup="   ")["user"]["bloodGroup"])
        for value in ["", "  ", None]:
            response = self.client.put("/api/profile", headers=self.headers_a, json={"bloodGroup": value})
            self.assertEqual(response.status_code, 200)
            self.assertIsNone(response.json()["bloodGroup"])
        self.assertEqual(self.client.put("/api/profile", headers=self.headers_a, json={"bloodGroup": "guessed"}).status_code, 422)

    def test_existing_records_not_rewritten_by_init_or_profile_save(self):
        self.execute("UPDATE profiles SET blood_group='A+' WHERE user_id=?", (self.a["user"]["id"],))
        database.init_db()
        response = self.client.put("/api/profile", headers=self.headers_a, json={"firstName": "Updated"})
        self.assertEqual(response.json()["bloodGroup"], "A+")

    def test_signup_explicitly_bypasses_legacy_schema_default(self):
        # Recreate only this disposable fixture's profile table with the old default.
        schema = self.rows("SELECT sql FROM sqlite_master WHERE name='profiles'")[0][0]
        self.execute("DROP TABLE profiles")
        self.execute(schema.replace("DEFAULT NULL", "DEFAULT 'A+'"))
        self.assertIsNone(self.signup("legacy-schema")["user"]["bloodGroup"])

    def test_frontend_backend_category_contract(self):
        text = (ROOT / "src/types/index.ts").read_text(encoding="utf-8")
        match = re.search(r"DOCUMENT_CATEGORIES = (\[[\s\S]*?\]) as const", text)
        self.assertIsNotNone(match)
        self.assertEqual(json.loads(match.group(1)), list(get_args(DocumentCategory)))

    def test_invalid_category_rejected_before_storage(self):
        for category in ["Other", "lab results", "Invalid", "   "]:
            with self.subTest(category=category), patch("backend.storage.save_uploaded_file", new_callable=AsyncMock) as save:
                response = self.upload(data={"category": category})
                self.assertEqual(response.status_code, 422)
                self.assertIn("category", str(response.json()["detail"]))
                save.assert_not_awaited()
            self.assert_no_upload()
        self.assertEqual(self.client.get("/api/passport", headers=self.headers_a).status_code, 200)

    def test_blank_title_bad_date_and_conflicting_doctor_leave_no_files(self):
        for data in [{"title": "   "}, {"document_date": "not-a-date"}, {"doctor": "Different clinician"}]:
            with patch("backend.storage.save_uploaded_file", new_callable=AsyncMock) as save:
                self.assertEqual(self.upload(data=data).status_code, 422)
                save.assert_not_awaited()
            self.assert_no_upload()

    def test_valid_categories_metadata_and_download_bytes(self):
        for category in get_args(DocumentCategory):
            response = self.upload(data={"category": category, "title": "  Fixture report  ",
                "issuing_doctor": "  Dr. Example / Test Clinic  ", "document_date": "2024-02-29"})
            self.assertEqual(response.status_code, 201)
            document = response.json()
            self.assertEqual(document["issuingDoctor"], "Dr. Example / Test Clinic")
            self.assertEqual(document["documentDate"], "2024-02-29")
            self.assertEqual(document["title"], "Fixture report")
            self.assertEqual(document["fileName"], "clinical-report.pdf")
            self.assertEqual(document["mimeType"], "application/pdf")
            row = self.rows("SELECT * FROM medical_documents WHERE id=?", (document["id"],))[0]
            self.assertEqual(row["issuing_doctor"], document["issuingDoctor"])
            self.assertEqual(row["document_date"], document["documentDate"])
            self.assertNotIn("file_path", document)
            self.assertNotIn(str(self.root), response.text)
            download = self.client.get(document["fileUrl"], headers=self.headers_a)
            self.assertEqual(download.status_code, 200)
            self.assertEqual(download.content, PDF)
            self.assertIn("clinical-report.pdf", download.headers["content-disposition"])
            self.assertEqual(download.headers["cache-control"], "no-store")
            passport = self.client.get("/api/passport", headers=self.headers_a).json()
            listed = next(d for d in passport["documents"] if d["id"] == document["id"])
            self.assertEqual(listed, document)

    def test_legacy_doctor_alias_preserved_and_unknown_not_invented(self):
        for data, expected in [({"doctor": "Legacy clinician"}, "Legacy clinician"), ({}, "")]:
            response = self.client.post("/api/passport/documents/upload", headers=self.headers_a,
                data={"title": "Fixture", "category": "Imaging", **data}, files={"file": ("fixture.pdf", PDF, "application/pdf")})
            self.assertEqual(response.status_code, 201)
            self.assertEqual(response.json()["issuingDoctor"], expected)

    def test_missing_file_returns_404_without_replacement(self):
        document = self.upload().json()
        record = self.rows("SELECT file_path FROM medical_documents WHERE id=?", (document["id"],))[0]
        path = Path(record["file_path"])
        path.unlink()  # Fixture file only.
        response = self.client.get(document["fileUrl"], headers=self.headers_a)
        self.assertEqual(response.status_code, 404)
        self.assertIn("unavailable", response.json()["detail"])
        self.assertNotIn(str(self.root), response.text)
        self.assertFalse(path.exists())
        self.assertEqual(self.rows("SELECT COUNT(*) FROM medical_documents")[0][0], 1)

    def test_legacy_demo_path_does_not_generate_pdf(self):
        document = self.upload().json()
        self.execute("UPDATE medical_documents SET file_path='demo/missing.pdf' WHERE id=?", (document["id"],))
        self.assertEqual(self.client.get(document["fileUrl"], headers=self.headers_a).status_code, 404)

    def test_unauthenticated_operations_rejected(self):
        document = self.upload().json()
        for headers in [{}, {"Authorization": "Bearer invalid-fixture-token"}]:
            for method, url in [("get", "/api/passport"), ("get", document["fileUrl"]),
                                ("delete", "/api/passport/documents/" + document["id"])]:
                self.assertEqual(getattr(self.client, method)(url, headers=headers).status_code, 401)
            self.assertEqual(self.upload(headers=headers).status_code, 401)
        self.assertEqual(self.rows("SELECT COUNT(*) FROM medical_documents")[0][0], 1)

    def test_cross_user_cannot_view_download_or_delete(self):
        document = self.upload().json()
        self.assertEqual(self.client.get("/api/passport", headers=self.headers_b).json()["documents"], [])
        for method, url in [("get", document["fileUrl"]), ("delete", "/api/passport/documents/" + document["id"])]:
            response = getattr(self.client, method)(url, headers=self.headers_b)
            self.assertEqual(response.status_code, 404)
            self.assertNotIn(str(self.root), response.text)
        self.assertEqual(self.client.get(document["fileUrl"], headers=self.headers_a).content, PDF)

    def test_document_update_routes_are_not_exposed(self):
        document = self.upload().json()
        for headers in [{}, self.headers_a, self.headers_b]:
            for method in ["put", "patch"]:
                response = getattr(self.client, method)("/api/passport/documents/" + document["id"], headers=headers, json={"title": "Tampered"})
                self.assertEqual(response.status_code, 405)
        self.assertEqual(self.rows("SELECT title FROM medical_documents")[0][0], "Fixture report")

    def test_storage_permission_failure_does_not_delete_metadata(self):
        document = self.upload().json()
        with patch("backend.storage.Path.lstat", side_effect=PermissionError("private-fixture-path")):
            response = self.client.delete("/api/passport/documents/" + document["id"], headers=self.headers_a)
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("private-fixture-path", response.text)
        self.assertEqual(self.rows("SELECT COUNT(*) FROM medical_documents")[0][0], 1)
        self.assertEqual(self.client.get(document["fileUrl"], headers=self.headers_a).content, PDF)

    def test_valid_owner_delete(self):
        document = self.upload().json()
        response = self.client.delete("/api/passport/documents/" + document["id"], headers=self.headers_a)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.rows("SELECT COUNT(*) FROM medical_documents")[0][0], 0)
        self.assertEqual(list(self.documents.glob("*")), [])

    def test_transaction_failure_rolls_back_record_timeline_and_file(self):
        with patch("backend.app.add_timeline_event_helper", side_effect=sqlite3.OperationalError("fixture failure")):
            response = self.upload()
            self.assertEqual(response.status_code, 500)
            self.assertNotIn(str(self.root), response.text)
        self.assert_no_upload()

    def test_oversized_empty_and_unsupported_upload_cleanup(self):
        with patch.object(storage, "MAX_FILE_SIZE", 8):
            self.assertEqual(self.upload().status_code, 413)
        self.assert_no_upload()
        self.assertEqual(self.upload(content=b"").status_code, 400)
        self.assert_no_upload()
        self.assertEqual(self.upload(name="fixture.exe", mime="application/octet-stream").status_code, 400)
        self.assert_no_upload()

    def test_interrupted_upload_removes_partial_file(self):
        file = UploadFile(io.BytesIO(PDF), filename="fixture.pdf", headers=Headers({"content-type": "application/pdf"}))
        with patch.object(file, "read", new=AsyncMock(side_effect=[b"%PDF", OSError("fixture interruption")])):
            with self.assertRaises(Exception) as caught:
                asyncio.run(storage.save_uploaded_file(file))
        self.assertEqual(caught.exception.status_code, 503)
        self.assert_no_upload()

    def test_owned_corrupt_path_cannot_read_or_delete_outside_storage(self):
        document = self.upload().json()
        outside = self.root / "private-fixture.pdf"
        outside.write_bytes(b"PRIVATE_FIXTURE")
        self.execute("UPDATE medical_documents SET file_path=? WHERE id=?", (str(outside), document["id"]))
        self.assertEqual(self.client.get(document["fileUrl"], headers=self.headers_a).status_code, 404)
        self.assertEqual(self.client.delete("/api/passport/documents/" + document["id"], headers=self.headers_a).status_code, 404)
        self.assertEqual(outside.read_bytes(), b"PRIVATE_FIXTURE")

if __name__ == "__main__":
    unittest.main()
