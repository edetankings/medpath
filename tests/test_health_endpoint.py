import sqlite3
import unittest
from unittest.mock import Mock, patch

from fastapi import HTTPException

from backend import app as backend_app


class HealthEndpointTests(unittest.TestCase):
    def test_returns_healthy_after_database_query(self):
        connection = Mock()
        connection.execute.return_value.fetchone.return_value = (1,)

        with patch.object(backend_app, "get_db_connection", return_value=connection):
            result = backend_app.health_check()

        self.assertEqual(result["status"], "healthy")
        self.assertEqual(result["database"], "sqlite_connected")
        self.assertIsInstance(result["timestamp"], int)
        connection.execute.assert_called_once_with("SELECT 1")
        connection.close.assert_called_once_with()

    def test_reports_database_query_failure(self):
        connection = Mock()
        connection.execute.side_effect = sqlite3.OperationalError("database unavailable")

        with patch.object(backend_app, "get_db_connection", return_value=connection):
            with self.assertRaises(HTTPException) as raised:
                backend_app.health_check()

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.detail, "Database unavailable.")
        connection.close.assert_called_once_with()

    def test_reports_database_connection_failure(self):
        with patch.object(
            backend_app,
            "get_db_connection",
            side_effect=sqlite3.OperationalError("database unavailable"),
        ):
            with self.assertRaises(HTTPException) as raised:
                backend_app.health_check()

        self.assertEqual(raised.exception.status_code, 503)
        self.assertEqual(raised.exception.detail, "Database unavailable.")


if __name__ == "__main__":
    unittest.main()
